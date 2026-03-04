import { db, appId } from "./firebase";
import {
    doc,
    runTransaction,
    collection,
    query,
    where,
    getDocs,
    Timestamp,
} from "firebase/firestore";

interface OrderItem {
    productId: string;
    quantity: number;
}

export const stockService = {
    /**
     * Reserves stock for an order.
     * - Checks if enough available quantity exists (onHand - reserved).
     * - Increases reservedQty.
     * - Creates citation in subcollection to ensure idempotency and tracking.
     */
    async reserveStock(userId: string, orderId: string, items: OrderItem[]) {
        return runTransaction(db, async (transaction) => {
            // 1. Reads
            const productRefs = items.map((item) => ({
                ref: doc(db, "artifacts", appId, "users", userId, "inventory_products", item.productId),
                qty: item.quantity,
                productId: item.productId,
            }));

            const productsDocs = await Promise.all(productRefs.map((p) => transaction.get(p.ref)));

            // Check for existing reservation to ensure idempotency
            // We check the first product's subcollection for this orderId to see if we already reserved.
            // A more robust way is to check the Order status, but we'll assume the caller calls this only when status changes to RESERVED.
            // However, for extra safety, we can read one reservation record.
            const firstResRef = doc(
                db,
                "artifacts",
                appId,
                "users",
                userId,
                "inventory_products",
                items[0].productId,
                "reservations",
                orderId
            );
            const firstResDoc = await transaction.get(firstResRef);
            if (firstResDoc.exists()) {
                throw new Error("Reservation already exists for this order.");
            }

            // 2. Logic & Validations
            for (let i = 0; i < productsDocs.length; i++) {
                const docSnap = productsDocs[i];
                if (!docSnap.exists()) {
                    throw new Error(`Product ${productRefs[i].productId} not found.`);
                }

                const data = docSnap.data();
                const onHand = data.onHandQty || data.quantity || 0; // Fallback to quantity if onHand not set
                const reserved = data.reservedQty || 0;
                const available = onHand - reserved;

                if (available < productRefs[i].qty) {
                    throw new Error(
                        `Insufficient stock for product ${data.name}. Requested: ${productRefs[i].qty}, Available: ${available}`
                    );
                }
            }

            // 3. Writes
            for (let i = 0; i < productsDocs.length; i++) {
                const item = productRefs[i];
                const currentReserved = productsDocs[i].data()?.reservedQty || 0;

                // Update Product
                transaction.update(item.ref, {
                    reservedQty: currentReserved + item.qty,
                    updatedAt: new Date().toISOString(),
                });

                // Create Reservation Record
                const resRef = doc(
                    db,
                    "artifacts",
                    appId,
                    "users",
                    userId,
                    "inventory_products",
                    item.productId,
                    "reservations",
                    orderId
                );

                transaction.set(resRef, {
                    orderId,
                    quantity: item.qty,
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString(),
                });
            }
        });
    },

    /**
     * Confirms stock deduction (Invoice).
     * - Decreases onHandQty.
     * - Decreases reservedQty.
     * - Marks reservation as CONSUMED.
     */
    async confirmOrderStock(userId: string, orderId: string, items: OrderItem[]) {
        return runTransaction(db, async (transaction) => {
            // 1. Reads
            const productRefs = items.map((item) => ({
                prodRef: doc(db, "artifacts", appId, "users", userId, "inventory_products", item.productId),
                resRef: doc(
                    db,
                    "artifacts",
                    appId,
                    "users",
                    userId,
                    "inventory_products",
                    item.productId,
                    "reservations",
                    orderId
                ),
                qty: item.quantity,
            }));

            const productDocs = await Promise.all(productRefs.map((p) => transaction.get(p.prodRef)));
            const resDocs = await Promise.all(productRefs.map((p) => transaction.get(p.resRef)));

            // 2. Logic & Writes
            for (let i = 0; i < productDocs.length; i++) {
                const prodDoc = productDocs[i];
                const resDoc = resDocs[i];
                const item = productRefs[i];

                if (!prodDoc.exists()) throw new Error("Product not found");

                // If reservation doesn't exist (maybe direct invoice without reservation), handle gracefully or error?
                // Requirement says: "Estoq fisico so baixa quando INVOICED". 
                // If we skipped RESERVED state, we treat as direct deduction.
                // But if we came from RESERVED, we must reduce reservedQty too.

                const prodData = prodDoc.data();
                let newOnHand = (prodData.onHandQty || prodData.quantity || 0) - item.qty;
                let newReserved = prodData.reservedQty || 0;

                if (resDoc.exists() && resDoc.data().status === 'ACTIVE') {
                    // It was reserved, so we reduce the reserved amount too
                    newReserved = Math.max(0, newReserved - item.qty);
                    transaction.update(item.resRef, {
                        status: 'CONSUMED',
                        consumedAt: new Date().toISOString()
                    });
                }

                transaction.update(item.prodRef, {
                    onHandQty: newOnHand,
                    reservedQty: newReserved,
                    quantity: newOnHand, // Sync legacy field for compatibility
                    updatedAt: new Date().toISOString(),
                });
            }
        });
    },

    /**
     * Cancels reservation.
     * - Decreases reservedQty.
     * - Marks reservation as RELEASED.
     */
    async cancelOrderReservation(userId: string, orderId: string, items: OrderItem[]) {
        return runTransaction(db, async (transaction) => {
            // 1. Reads
            const productRefs = items.map((item) => ({
                prodRef: doc(db, "artifacts", appId, "users", userId, "inventory_products", item.productId),
                resRef: doc(
                    db,
                    "artifacts",
                    appId,
                    "users",
                    userId,
                    "inventory_products",
                    item.productId,
                    "reservations",
                    orderId
                ),
                qty: item.quantity,
            }));

            const productDocs = await Promise.all(productRefs.map((p) => transaction.get(p.prodRef)));
            const resDocs = await Promise.all(productRefs.map((p) => transaction.get(p.resRef)));

            // 2. Logic & Writes
            for (let i = 0; i < productDocs.length; i++) {
                const prodDoc = productDocs[i];
                const resDoc = resDocs[i];
                const item = productRefs[i];

                if (!resDoc.exists() || resDoc.data().status !== 'ACTIVE') {
                    continue; // Nothing to release
                }

                const prodData = prodDoc.data();
                const newReserved = Math.max(0, (prodData.reservedQty || 0) - item.qty);

                transaction.update(item.prodRef, {
                    reservedQty: newReserved,
                    updatedAt: new Date().toISOString(),
                });

                transaction.update(item.resRef, {
                    status: 'RELEASED',
                    releasedAt: new Date().toISOString()
                });
            }
        });
    }
};
