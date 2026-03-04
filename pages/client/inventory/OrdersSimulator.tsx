import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, RefreshCw, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { stockService } from '../../../lib/stockService';

const OrdersSimulator = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        // Listen to products to show realtime stock variations
        const unsubProd = onSnapshot(collection(db, "artifacts", appId, "users", uid, "inventory_products"), snap => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        // Listen to simulated orders
        const unsubOrders = onSnapshot(collection(db, "artifacts", appId, "users", uid, "simulated_orders"), snap => {
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsubProd(); unsubOrders(); };
    }, []);

    const createDraftOrder = async () => {
        if (!selectedProduct || !auth.currentUser) return;
        const prod = products.find(p => p.id === selectedProduct);
        await addDoc(collection(db, "artifacts", appId, "users", auth.currentUser.uid, "simulated_orders"), {
            status: 'DRAFT',
            items: [{ productId: selectedProduct, productName: prod.name, quantity: qty }],
            createdAt: new Date().toISOString()
        });
    };

    const handleStatusChange = async (order: any, newStatus: string) => {
        if (!auth.currentUser) return;
        setLoading(true);
        const uid = auth.currentUser.uid;

        try {
            if (newStatus === 'RESERVED') {
                // Attempt to reserve
                await stockService.reserveStock(uid, order.id, order.items);
            } else if (newStatus === 'INVOICED') {
                // Commit stock
                await stockService.confirmOrderStock(uid, order.id, order.items);
            } else if (newStatus === 'CANCELED') {
                // If it was reserved, release it
                if (order.status === 'RESERVED') {
                    await stockService.cancelOrderReservation(uid, order.id, order.items);
                }
            }

            // Update Order Status locally
            await updateDoc(doc(db, "artifacts", appId, "users", uid, "simulated_orders", order.id), {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });

        } catch (error: any) {
            alert("Erro na transação: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft /></button>
                <h1 className="text-2xl font-bold">Simulador de Pedidos & Reservas</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Order */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold mb-4">Criar Pedido (Rascunho)</h3>
                    <div className="flex gap-2">
                        <select
                            className="border p-2 rounded flex-1"
                            value={selectedProduct}
                            onChange={e => setSelectedProduct(e.target.value)}
                        >
                            <option value="">Selecione Produto...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (Disp: {(p.onHandQty || 0) - (p.reservedQty || 0)})
                                </option>
                            ))}
                        </select>
                        <input type="number"
                            value={qty}
                            onChange={e => setQty(Number(e.target.value))}
                            className="border p-2 rounded w-20"
                        />
                        <button onClick={createDraftOrder} className="bg-blue-600 text-white px-4 py-2 rounded">Criar</button>
                    </div>
                </div>

                {/* Product Monitor */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold mb-4">Monitor de Estoque Real-time</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500">
                                <th>Produto</th>
                                <th>Físico</th>
                                <th>Reservado</th>
                                <th>Disponível</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => {
                                const onHand = p.onHandQty || p.quantity || 0;
                                const reserved = p.reservedQty || 0;
                                return (
                                    <tr key={p.id} className="border-t">
                                        <td className="py-2">{p.name}</td>
                                        <td className="font-medium">{onHand}</td>
                                        <td className="text-orange-600 font-medium">{reserved}</td>
                                        <td className="text-green-600 font-bold">{onHand - reserved}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Orders List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold mb-4">Pedidos</h3>
                <div className="grid gap-4">
                    {orders.map(order => (
                        <div key={order.id} className="flex items-center justify-between border p-4 rounded-lg">
                            <div>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'DRAFT' ? 'bg-gray-200' :
                                        order.status === 'RESERVED' ? 'bg-orange-100 text-orange-700' :
                                            order.status === 'INVOICED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>{order.status}</span>
                                <div className="mt-1 text-sm text-gray-600">
                                    {order.items.map((i: any) => `${i.productName} (x${i.quantity})`).join(', ')}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {order.status === 'DRAFT' && (
                                    <button
                                        disabled={loading}
                                        onClick={() => handleStatusChange(order, 'RESERVED')}
                                        className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                                    >
                                        Reservar
                                    </button>
                                )}

                                {order.status === 'RESERVED' && (
                                    <>
                                        <button
                                            disabled={loading}
                                            onClick={() => handleStatusChange(order, 'INVOICED')}
                                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center gap-1"
                                        >
                                            <Check size={14} /> Faturar
                                        </button>
                                        <button
                                            disabled={loading}
                                            onClick={() => handleStatusChange(order, 'CANCELED')}
                                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center gap-1"
                                        >
                                            <XCircle size={14} /> Cancelar/Liberar
                                        </button>
                                    </>
                                )}

                                {order.status === 'INVOICED' && (
                                    <span className="text-sm text-gray-400">Concluído</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OrdersSimulator;
