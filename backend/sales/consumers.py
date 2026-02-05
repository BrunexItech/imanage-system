import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Sale

class SalesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.business_id = self.scope['url_route']['kwargs']['business_id']
        self.room_group_name = f'sales_{self.business_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        
        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'sales_message',
                'message': message
            }
        )
    
    # Receive message from room group
    async def sales_message(self, event):
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))
    
    # New sale notification
    async def new_sale(self, event):
        sale_data = event['sale']
        
        await self.send(text_data=json.dumps({
            'type': 'new_sale',
            'sale': sale_data
        }))