import os
import django
import sys
import uuid
from datetime import datetime

# Bootstrap Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from users.models import UserProfile
from crm.models import Contact, Deal, Task, Organization, Individual
from inventory.models import Product, ProductCategory, Brand, Depot, StockMovement, PriceTable
from saas_master.models import Company, Instance
import firebase_admin
from firebase_admin import credentials, firestore

def migrate():
    print("Iniciando migração do Firestore para Django...")
    db = firestore.client()
    app_id = os.environ.get('FIREBASE_APP_ID', 'bidflow-crm')

    # 1. Migrar Empresas (SaaS Master)
    print("Migrando Empresas...")
    companies_ref = db.collection('artifacts').document(app_id).collection('companies')
    for doc in companies_ref.stream():
        data = doc.to_dict()
        company, created = Company.objects.get_or_create(
            name=data.get('name', 'Empresa Sem Nome'),
            defaults={
                'tax_id': data.get('tax_id', ''),
                'contact_email': data.get('contact_email', ''),
                'status': data.get('status', 'active'),
            }
        )
        if created:
            print(f"Empresa criada: {company.name}")

    # 2. Migrar Usuários e Perfis
    print("Migrando Usuários...")
    # No Firebase, os usuários estão em 'artifacts/{app_id}/team' ou deduzidos das subcoleções
    team_ref = db.collection('artifacts').document(app_id).collection('team')
    for doc in team_ref.stream():
        data = doc.to_dict()
        uid = doc.id
        email = data.get('email', f"{uid}@bidflow.com")
        
        user, created = User.objects.get_or_create(
            username=uid,
            defaults={
                'email': email,
                'first_name': data.get('name', '').split(' ')[0],
                'is_staff': data.get('role') == 'superadmin',
            }
        )
        
        profile, p_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'role': data.get('role', 'client'),
                'status': data.get('status', 'active'),
                'finance': data.get('finance', False),
                'support': data.get('support', False),
                'sales': data.get('sales', False),
                'tech': data.get('tech', False),
            }
        )
        print(f"Usuário processado: {user.username}")

        # 3. Migrar Dados do CRM para este Usuário
        migrate_crm_data(db, app_id, uid, user)
        
        # 4. Migrar Dados de Inventário para este Usuário
        migrate_inventory_data(db, app_id, uid, user)

def migrate_crm_data(db, app_id, uid, user):
    user_data_path = db.collection('artifacts').document(app_id).collection('users').document(uid)
    
    # Contactos
    print(f"  Migrando contactos para {user.username}...")
    contacts_ref = user_data_path.collection('contacts')
    contact_map = {} # para deals e tasks
    for doc in contacts_ref.stream():
        data = doc.to_dict()
        contact = Contact.objects.create(
            user=user,
            name=data.get('name', 'Sem Nome'),
            phone=data.get('phone', ''),
            email=data.get('email'),
            notes=data.get('notes'),
        )
        contact_map[doc.id] = contact

    # Deals (Negócios)
    print(f"  Migrando negócios para {user.username}...")
    deals_ref = user_data_path.collection('deals')
    for doc in deals_ref.stream():
        data = doc.to_dict()
        Deal.objects.create(
            user=user,
            contact=contact_map.get(data.get('contactId')),
            title=data.get('title', 'Sem Título'),
            value=data.get('value', 0),
            stage_id=data.get('stageId'),
            contact_name=data.get('contactName'),
        )

    # Tasks
    print(f"  Migrando tarefas para {user.username}...")
    tasks_ref = user_data_path.collection('tasks')
    for doc in tasks_ref.stream():
        data = doc.to_dict()
        Task.objects.create(
            user=user,
            title=data.get('title', 'Sem Título'),
            description=data.get('description'),
            status=data.get('status', 'pending'),
            priority=data.get('priority', 'medium'),
            due_date=data.get('dueDate'),
        )

def migrate_inventory_data(db, app_id, uid, user):
    user_data_path = db.collection('artifacts').document(app_id).collection('users').document(uid)
    
    # Categorias e Marcas (Padrão)
    cat, _ = ProductCategory.objects.get_or_create(user=user, name="Geral")
    brand, _ = Brand.objects.get_or_create(user=user, name="Genérica")
    depot, _ = Depot.objects.get_or_create(user=user, name="Depósito Principal")

    # Produtos
    print(f"  Migrando estoque para {user.username}...")
    prods_ref = user_data_path.collection('inventory_products')
    for doc in prods_ref.stream():
        data = doc.to_dict()
        product = Product.objects.create(
            user=user,
            name=data.get('name', 'Produto Sem Nome'),
            sku=data.get('sku'),
            category=cat,
            brand=brand,
            min_stock=data.get('minStock', 0),
        )
        # Preço inicial
        PriceTable.objects.create(
            user=user,
            product=product,
            cost_price=data.get('costPrice', 0),
            selling_price=data.get('salePrice', 0),
        )
        # Movimentação inicial se houver quantidade
        qty = data.get('quantity', 0)
        if qty > 0:
            StockMovement.objects.create(
                user=user,
                product=product,
                depot=depot,
                type='IN',
                quantity=qty,
                notes="Migração Inicial"
            )

if __name__ == "__main__":
    migrate()
    print("Migração concluída com sucesso!")
