from django.db import models
from django.utils import timezone
import uuid  # For unique transaction IDs

# Sale transaction model
class Sale(models.Model):
    # Sale status choices
    STATUS_CHOICES = (
        ('completed', 'Completed'),
        ('pending', 'Pending'),
        ('refunded', 'Refunded'),
        ('cancelled', 'Cancelled'),
    )
    
    # Payment status choices
    PAYMENT_STATUS_CHOICES = (
        ('paid', 'Paid'),
        ('partial', 'Partial'),
        ('pending', 'Pending'),
        ('failed', 'Failed'),
    )
    
    # Transaction identifiers
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    transaction_id = models.CharField(max_length=100, unique=True, default=uuid.uuid4)  # Unique sale ID
    receipt_number = models.CharField(max_length=50, unique=True)  # Human-readable receipt #
    
    # Customer info (optional for walk-in customers)
    customer_name = models.CharField(max_length=200, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    
    # Sale details
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Before tax
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Tax calculated
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Discount applied
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Final amount
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Cash received
    change_given = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Change to customer
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='paid')
    
    # Shift and user tracking
    cashier = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='sales_made')
    shift = models.ForeignKey('sales.Shift', on_delete=models.SET_NULL, null=True, blank=True)  # Will create Shift model
    
    # Offline sync tracking
    is_offline_sale = models.BooleanField(default=False)  # Created offline in PWA
    sync_status = models.CharField(max_length=20, default='synced', choices=(('synced', 'Synced'), ('pending', 'Pending'), ('failed', 'Failed')))
    offline_id = models.CharField(max_length=100, blank=True)  # ID used in PWA IndexedDB
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    synced_at = models.DateTimeField(null=True, blank=True)  # When synced to cloud
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Sale {self.receipt_number} - {self.total_amount}"
    
    # Calculate if fully paid
    @property
    def is_fully_paid(self):
        return self.amount_paid >= self.total_amount
    
    # Calculate balance due
    @property
    def balance_due(self):
        return max(self.total_amount - self.amount_paid, 0)

# Sale items (products in a sale)
class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('inventory.Product', on_delete=models.SET_NULL, null=True)
    product_name = models.CharField(max_length=200)  # Snapshot of product name at time of sale
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of sale
    total_price = models.DecimalField(max_digits=10, decimal_places=2)  # quantity * unit_price
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)  # For profit calculation
    profit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # Actual profit
    
    class Meta:
        ordering = ['id']
    
    def __str__(self):
        return f"{self.product_name} x{self.quantity}"
    
    # Auto-calculate total price and profit before saving
    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        self.profit = (self.unit_price - self.cost_price) * self.quantity
        super().save(*args, **kwargs)

# Cashier shift management
class Shift(models.Model):
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    cashier = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='shifts')
    shift_number = models.CharField(max_length=50)  # Unique shift identifier
    
    # Shift timing
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Cash management
    starting_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    actual_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    difference = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # actual - expected
    
    # Reconciliation
    reconciled_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reconciled_shifts')
    reconciled_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-start_time']
    
    def __str__(self):
        return f"Shift {self.shift_number} - {self.cashier.email}"
    
    # Calculate expected cash (starting + cash sales)
    def calculate_expected_cash(self):
        cash_sales_total = Sale.objects.filter(
            shift=self,
            payment_method='cash'  # Will add payment_method field
        ).aggregate(total=models.Sum('amount_paid'))['total'] or 0
        self.expected_cash = self.starting_cash + cash_sales_total
        return self.expected_cash
    
    # Calculate difference
    def calculate_difference(self):
        self.difference = self.actual_cash - self.expected_cash
        return self.difference