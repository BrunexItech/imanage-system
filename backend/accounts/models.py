from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

# Custom user manager handles creating regular users and superusers
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        # Email validation
        if not email:
            raise ValueError('The Email field must be set')
        # Normalize email format
        email = self.normalize_email(email)
        # Create user instance with extra fields
        user = self.model(email=email, **extra_fields)
        # Hash password
        user.set_password(password)
        # Save to database
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        # Superusers have staff and superuser permissions
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        # Use create_user method with elevated privileges
        return self.create_user(email, password, **extra_fields)

# Main User model replacing Django's default User
class User(AbstractBaseUser, PermissionsMixin):
    # Role choices for different system users
    USER_ROLES = (
        ('owner', 'Business Owner'),
        ('manager', 'Manager'),
        ('cashier', 'Cashier'),
        ('supervisor', 'Supervisor'),
    )
    
    # Unique email as login identifier
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    phone_number = models.CharField(max_length=20, blank=True)  # Optional phone
    # Role determines permissions in PWA and owner app
    role = models.CharField(max_length=20, choices=USER_ROLES, default='cashier')
    is_active = models.BooleanField(default=True)  # Can login
    is_staff = models.BooleanField(default=False)  # Can access admin
    date_joined = models.DateTimeField(default=timezone.now)  # Auto timestamp
    
    # Links user to a specific business (single-tenant, future multi-tenant)
    business = models.ForeignKey(
        'business.Business',  # Will create this model in business app
        on_delete=models.CASCADE,  # Delete users if business deleted
        null=True,  # Allow null during registration
        blank=True,  # Allow blank in forms
        related_name='employees'  # Access via business.employees
    )
    
    # Shift management fields for POS cashiers
    current_shift_open = models.BooleanField(default=False)  # Is shift active?
    current_shift_start = models.DateTimeField(null=True, blank=True)  # When shift started
    current_shift_float = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # Starting cash amount
    
    # Use custom manager instead of default
    objects = CustomUserManager()
    
    # Use email instead of username for authentication
    USERNAME_FIELD = 'email'
    # Required fields when creating superuser
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        ordering = ['-date_joined']  # Newest users first
    
    def __str__(self):
        # String representation for admin display
        return f"{self.email} ({self.get_role_display()})"
    
    # Helper method for full name display
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    # Helper method for role-based permissions (will use in views)
    def is_owner(self):
        return self.role == 'owner'
    
    def is_cashier(self):
        return self.role == 'cashier'
    
    def can_access_pos(self):
        # Cashiers and supervisors can use POS
        return self.role in ['cashier', 'supervisor']
    
    def can_access_owner_app(self):
        # Only owners and managers can use monitoring app
        return self.role in ['owner', 'manager']