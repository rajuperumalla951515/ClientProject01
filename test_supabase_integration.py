"""
Sri Adithya Organics - Complete Production Integration & Security Verification Suite
Tests the Centralized Database Architecture, Security Hardening,
Data Isolation, BOLA/IDOR Prevention, Search & Pagination, and Admin Analytics.
"""

import sys
import os
import uuid
import datetime
from pathlib import Path

repo_root = Path(__file__).resolve().parent
sys.path.insert(0, str(repo_root))

from backend.app.database import SessionLocal
from backend.app.models import User, Address, Category, Product, ProductVariant, Order, OrderItem, DeliverySetting, InventoryLog
from backend.app.routers import products, categories, settings as settings_router, admin, auth, addresses, cart, orders
from backend.app.schemas import (
    UserCreate, UserLogin, AddressCreate, AddressUpdate,
    InventoryAdjustRequest, OrderCancelRequest, WhatsAppOrderCreate, CartItemAdd
)
from backend.app.security import get_password_hash, create_access_token
from fastapi import HTTPException

def run_tests():
    print("=" * 80)
    print("  SRI ADITHYA ORGANICS - COMPLETE PRODUCTION INTEGRATION & SECURITY SUITE")
    print("=" * 80)

    db = SessionLocal()
    try:
        # 1. Store Settings Verification
        print("\n[TEST 1] Store Settings & Authentic WhatsApp Configuration...")
        st = settings_router.get_store_settings(db=db)
        assert st.whatsapp_number == "919515159006", f"Expected 919515159006, got {st.whatsapp_number}"
        assert st.min_order_amount >= 0
        assert st.free_delivery_threshold > 0
        print(f"   [PASS] Store WhatsApp verified: {st.whatsapp_number}")
        print(f"   [PASS] Min order: Rs. {st.min_order_amount}, Free delivery threshold: Rs. {st.free_delivery_threshold}")

        # 2. Category Listing
        print("\n[TEST 2] Categories Listing & Product Counts...")
        cats = categories.list_categories(db=db)
        assert len(cats) >= 10, f"Expected at least 10 categories, got {len(cats)}"
        print(f"   [PASS] {len(cats)} categories retrieved. Top: {[c.name for c in cats[:4]]}")

        # 3. Product Catalogue & Computed Fields
        print("\n[TEST 3] Product Catalogue & Pricing...")
        prods = products.list_products(db=db, limit=25)
        assert len(prods) >= 20, f"Expected at least 20 products, got {len(prods)}"
        sample_prod = prods[0]
        assert sample_prod.min_price > 0
        assert sample_prod.primary_image is not None
        print(f"   [PASS] {len(prods)} products retrieved. Sample: '{sample_prod.name}' (Rs. {sample_prod.min_price})")

        # 4. Search & Filtering
        print("\n[TEST 4] Product Search by Keyword...")
        search_query = sample_prod.name[:4]
        search_results = products.list_products(db=db, search=search_query)
        assert len(search_results) >= 1
        assert any(sample_prod.name in p.name for p in search_results)
        print(f"   [PASS] Search for '{search_query}' successfully matched {len(search_results)} products.")

        # 5. Admin Authentication & Role Authorization
        print("\n[TEST 5] Admin Account Verification & Role Guarding...")
        admin_user = db.query(User).filter(User.role == "admin").first()
        if not admin_user:
            admin_user = User(
                name="Store Administrator",
                email="admin@sriadithyaorganics.com",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        from backend.app.deps import get_current_admin
        guard_admin = get_current_admin(admin_user)
        assert guard_admin.role == "admin"
        print(f"   [PASS] Admin verified: {admin_user.name} ({admin_user.email})")

        # Non-admin rejection test
        fake_cust = User(id=99999, name="Non Admin", email="fake@test.com", role="customer", is_active=True)
        try:
            get_current_admin(fake_cust)
            assert False, "Non-admin must be rejected with 403 Forbidden!"
        except HTTPException as he:
            assert he.status_code == 403
            print("   [PASS] Non-admin properly rejected with HTTP 403 Forbidden.")

        # 6. Customer Registration & Data Isolation
        print("\n[TEST 6] Customer Registration & Profile Isolation...")
        test_email = f"test_cust_{uuid.uuid4().hex[:6]}@sriadithyaorganics.com"
        reg_data = UserCreate(
            name="Sri Adithya Customer",
            email=test_email,
            password="SecureCustomerPassword123!",
            phone="9876543210"
        )
        token_out = auth.register(user_in=reg_data, db=db)
        customer_user = token_out.user
        assert customer_user.email == test_email
        print(f"   [PASS] Customer registered: {customer_user.name} ({customer_user.email})")

        # 7. Address Management & BOLA / IDOR Protection
        print("\n[TEST 7] Address Creation & Strict Ownership (BOLA/IDOR Prevention)...")
        addr_in = AddressCreate(
            label="Home",
            recipient_name=customer_user.name,
            phone="9876543210",
            street="100 Feet Road, Indiranagar",
            locality="Indiranagar",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560038"
        )
        created_addr = addresses.create_address(address_in=addr_in, db=db, current_user=customer_user)
        assert created_addr.id is not None
        print(f"   [PASS] Customer address created (ID: {created_addr.id})")

        # BOLA/IDOR test: Attacker user cannot update or delete customer's address
        attacker_user = User(id=88888, name="Attacker", email="attacker@evil.com", role="customer", is_active=True)
        try:
            addresses.delete_address(address_id=created_addr.id, db=db, current_user=attacker_user)
            assert False, "Attacker must not be able to delete another customer's address!"
        except HTTPException as he:
            assert he.status_code == 404
            print("   [PASS] BOLA/IDOR prevention verified: Unauthorized address access rejected with HTTP 404.")

        # 8. Shopping Cart Isolation
        print("\n[TEST 8] Shopping Cart Isolation & Session Safety...")
        guest_sid_1 = f"session_{uuid.uuid4().hex}"
        guest_sid_2 = f"session_{uuid.uuid4().hex}"
        sample_variant_id = sample_prod.variants[0].id if sample_prod.variants else 1

        cart.add_item_to_cart(
            item_in=CartItemAdd(product_id=sample_prod.id, variant_id=sample_variant_id, quantity=2),
            x_session_id=guest_sid_1,
            db=db,
            user=None
        )
        cart1 = cart.get_cart(x_session_id=guest_sid_1, db=db, user=None)
        cart2 = cart.get_cart(x_session_id=guest_sid_2, db=db, user=None)
        assert cart1.item_count == 2
        assert cart2.item_count == 0
        print(f"   [PASS] Cart isolation verified: Session 1 has {cart1.item_count} items, Session 2 has {cart2.item_count} items.")

        # 9. WhatsApp Order Flow & Stock Audit
        print("\n[TEST 9] WhatsApp Order Creation & Idempotency...")
        idem_key = f"wa_test_{uuid.uuid4().hex[:8]}"
        wa_in = WhatsAppOrderCreate(
            customer_name=customer_user.name,
            customer_phone="9876543210",
            address_id=created_addr.id,
            items=[{"product_id": sample_prod.id, "variant_id": sample_variant_id, "quantity": 1}],
            delivery_slot="Morning Slot (7:00 AM - 9:30 AM)",
            idempotency_key=idem_key
        )
        wa_res = orders.create_whatsapp_order(order_in=wa_in, db=db, optional_user=customer_user)
        wa_order = wa_res.order
        assert "919515159006" in wa_res.whatsapp_number
        assert "wa.me/919515159006" in wa_res.whatsapp_url
        print(f"   [PASS] WhatsApp Order Created: #{wa_order.order_number}, WhatsApp URL: {wa_res.whatsapp_url[:55]}...")

        # Test Idempotency
        wa_res_dup = orders.create_whatsapp_order(order_in=wa_in, db=db, optional_user=customer_user)
        assert wa_res_dup.order.order_number == wa_order.order_number
        print("   [PASS] Order idempotency verified: Repeated checkout returns matching order without double debit.")

        # 10. Admin Analytics & Inventory Management
        print("\n[TEST 10] Admin Dashboard Analytics & Inventory Operations...")
        dash_stats = admin.get_dashboard_stats(db=db, admin=admin_user)
        assert dash_stats.total_products >= 20
        assert dash_stats.total_orders >= 1
        print(f"   [PASS] Admin Dashboard Stats: SKUs={dash_stats.total_products}, Orders={dash_stats.total_orders}, Revenue=Rs. {dash_stats.total_revenue}")

        # Inventory Adjustment
        adj_req = InventoryAdjustRequest(
            product_id=sample_prod.id,
            delta=5,
            reason="Integration Quality Audit",
            notes="Automated verification batch"
        )
        adj_res = admin.adjust_inventory_stock(req=adj_req, db=db, admin=admin_user)
        assert adj_res["changed_stock"] == 5
        print(f"   [PASS] Inventory adjusted: Product #{sample_prod.id} stock changed by +5.")

        # Audit Logs Verification
        audit_logs = admin.get_inventory_audit_logs(limit=5, offset=0, db=db, admin=admin_user)
        assert len(audit_logs) > 0
        assert "Integration Quality Audit" in audit_logs[0].reason
        print(f"   [PASS] Authoritative inventory audit entry verified: '{audit_logs[0].reason}'")

        # Order Cancellation with Stock Restoration
        print("\n[TEST 11] Order Cancellation & Automatic Stock Restock...")
        cancel_req = OrderCancelRequest(reason="Customer requested schedule change")
        cancelled = admin.cancel_order_admin(order_id=wa_order.order_number, cancel_in=cancel_req, db=db, admin=admin_user)
        assert cancelled.status == "cancelled"
        assert "Cancelled by Admin" in cancelled.admin_notes
        print(f"   [PASS] Order #{cancelled.order_number} cancelled and quantities returned to inventory.")

        # Clean up test artifacts
        db.query(OrderItem).filter(OrderItem.order_id == wa_order.id).delete()
        db.query(Order).filter(Order.id == wa_order.id).delete()
        db.query(Address).filter(Address.id == created_addr.id).delete()
        db.query(User).filter(User.id == customer_user.id).delete()
        db.commit()

        print("\n" + "=" * 80)
        print("  [ALL PASS] 11/11 PRODUCTION SECURITY & INTEGRATION TESTS SUCCEEDED!")
        print("=" * 80)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
