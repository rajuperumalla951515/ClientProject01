from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

TWO_PLACES = Decimal("0.01")

def to_decimal(val: Any) -> Decimal:
    """Convert any number, float, string or Decimal to an exact 2-decimal Decimal."""
    if val is None:
        return Decimal("0.00")
    if isinstance(val, Decimal):
        return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    return Decimal(str(val)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

def round_currency(val: Decimal) -> Decimal:
    """Round to 2 decimal places using standard ROUND_HALF_UP."""
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

class CalculatedLineItem(BaseModel):
    product_id: int
    variant_id: int
    product_name: str
    variant_name: str
    quantity: int
    unit_price: float
    mrp: float
    total_price: float
    savings: float

class PricingCalculationResult(BaseModel):
    items: List[CalculatedLineItem]
    item_count: int
    subtotal: float
    total_mrp: float
    discount: float  # Savings from MRP
    delivery_fee: float
    tax: float
    total_amount: float
    free_delivery_threshold: float
    free_delivery_progress: float
    amount_needed_for_free_delivery: float

def compute_financials(
    raw_items: List[Dict[str, Any]],
    free_delivery_threshold: Any = 499.0,
    standard_delivery_fee: Any = 39.0,
    min_order_amount: Any = 99.0
) -> PricingCalculationResult:
    """
    Centralized, authoritative pricing engine for Sri Adithya Organics.
    Performs pure Decimal arithmetic to prevent floating point drift.
    """
    free_thresh_dec = to_decimal(free_delivery_threshold)
    standard_fee_dec = to_decimal(standard_delivery_fee)

    subtotal_dec = Decimal("0.00")
    total_mrp_dec = Decimal("0.00")
    total_qty = 0
    calculated_items: List[CalculatedLineItem] = []

    for item in raw_items:
        qty = int(item.get("quantity", 1))
        if qty <= 0:
            continue
        unit_price = to_decimal(item.get("unit_price") or item.get("price", 0))
        mrp = to_decimal(item.get("mrp") or unit_price)

        line_total = round_currency(unit_price * Decimal(qty))
        line_mrp = round_currency(mrp * Decimal(qty))
        line_savings = max(Decimal("0.00"), line_mrp - line_total)

        subtotal_dec += line_total
        total_mrp_dec += line_mrp
        total_qty += qty

        calculated_items.append(CalculatedLineItem(
            product_id=int(item["product_id"]),
            variant_id=int(item["variant_id"]),
            product_name=str(item.get("product_name", "")),
            variant_name=str(item.get("variant_name", "")),
            quantity=qty,
            unit_price=float(unit_price),
            mrp=float(mrp),
            total_price=float(line_total),
            savings=float(line_savings)
        ))

    # Delivery Fee logic
    if subtotal_dec == Decimal("0.00"):
        delivery_fee_dec = Decimal("0.00")
        free_progress = 0.0
        needed_for_free = float(free_thresh_dec)
    elif subtotal_dec >= free_thresh_dec:
        delivery_fee_dec = Decimal("0.00")
        free_progress = 100.0
        needed_for_free = 0.0
    else:
        delivery_fee_dec = standard_fee_dec
        ratio = float((subtotal_dec / free_thresh_dec) * Decimal("100.0"))
        free_progress = min(100.0, round(ratio, 1))
        needed_for_free = float(round_currency(free_thresh_dec - subtotal_dec))

    discount_dec = max(Decimal("0.00"), total_mrp_dec - subtotal_dec)
    tax_dec = Decimal("0.00")
    total_amount_dec = round_currency(subtotal_dec + delivery_fee_dec + tax_dec)

    return PricingCalculationResult(
        items=calculated_items,
        item_count=total_qty,
        subtotal=float(subtotal_dec),
        total_mrp=float(total_mrp_dec),
        discount=float(discount_dec),
        delivery_fee=float(delivery_fee_dec),
        tax=float(tax_dec),
        total_amount=float(total_amount_dec),
        free_delivery_threshold=float(free_thresh_dec),
        free_delivery_progress=free_progress,
        amount_needed_for_free_delivery=needed_for_free
    )
