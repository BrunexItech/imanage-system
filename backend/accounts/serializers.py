from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

# User registration serializer
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'role', 'business']
        extra_kwargs = {
            'password': {'write_only': True},
            'phone_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'business': {'required': False, 'allow_null': True},
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'role': {'required': False, 'allow_null': True}
        }
    
    def create(self, validated_data):
        # Remove business from validated data if present
        business = validated_data.pop('business', None)
        
        # Ensure phone_number is never None
        if 'phone_number' not in validated_data or validated_data['phone_number'] is None:
            validated_data['phone_number'] = ''
        
        # Ensure role has a default
        if 'role' not in validated_data or not validated_data['role']:
            validated_data['role'] = 'cashier'
        
        # Create user with hashed password
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data.get('phone_number', ''),
            role=validated_data.get('role', 'cashier')
        )
        
        # Assign business if provided
        if business:
            user.business = business
            user.save()
            
        return user

# User login serializer
class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        # Authenticate user
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')
        return user

# User profile serializer
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone_number', 'role', 
                  'is_active', 'current_shift_open', 'current_shift_start', 'current_shift_float']
        read_only_fields = ['email']