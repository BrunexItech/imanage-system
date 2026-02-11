import React, { forwardRef } from 'react';
import {
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Store as StoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

const ReceiptTemplate = forwardRef(({ data }, ref) => {
  const { business, sale, items, totals } = data;

  return (
    <Box ref={ref} sx={{ 
      width: '80mm', // Standard thermal receipt width
      p: 2,
      bgcolor: 'white',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          {business.name}
        </Typography>
        <Typography variant="body2">{business.address}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 0.5 }}>
          {business.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon fontSize="small" />
              <Typography variant="caption">{business.phone}</Typography>
            </Box>
          )}
          {business.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmailIcon fontSize="small" />
              <Typography variant="caption">{business.email}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

      {/* Receipt Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2">Receipt: {sale.receipt_number}</Typography>
        <Typography variant="body2">{sale.date}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2">Cashier: {sale.cashier}</Typography>
        <Typography variant="body2">Customer: {sale.customer_name}</Typography>
      </Box>
      {sale.customer_phone && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Tel: {sale.customer_phone}
        </Typography>
      )}

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

      {/* Items Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ p: 0.5, fontWeight: 'bold' }}>Item</TableCell>
              <TableCell sx={{ p: 0.5, fontWeight: 'bold' }} align="center">Qty</TableCell>
              <TableCell sx={{ p: 0.5, fontWeight: 'bold' }} align="right">Price</TableCell>
              <TableCell sx={{ p: 0.5, fontWeight: 'bold' }} align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell sx={{ p: 0.5 }}>{item.name}</TableCell>
                <TableCell sx={{ p: 0.5 }} align="center">{item.quantity}</TableCell>
                <TableCell sx={{ p: 0.5 }} align="right">{item.price.toFixed(2)}</TableCell>
                <TableCell sx={{ p: 0.5 }} align="right">{item.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

      {/* Totals */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '60%' }}>
          <Typography>Subtotal:</Typography>
          <Typography>{totals.subtotal.toFixed(2)}</Typography>
        </Box>
        {totals.discount > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '60%' }}>
            <Typography>Discount:</Typography>
            <Typography>-{totals.discount.toFixed(2)}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '60%' }}>
          <Typography>Tax ({business.tax_rate}%):</Typography>
          <Typography>{totals.tax.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '60%', fontWeight: 'bold', mt: 1 }}>
          <Typography>TOTAL:</Typography>
          <Typography>{totals.total.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '60%', mt: 1 }}>
          <Typography>Paid:</Typography>
          <Typography>{totals.paid.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '60%' }}>
          <Typography>Change:</Typography>
          <Typography>{totals.change.toFixed(2)}</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

      {/* Footer */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
          {business.footer}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Thank you for shopping with us!
        </Typography>
        <Typography variant="caption" display="block">
          {new Date().toLocaleDateString('en-KE')}
        </Typography>
      </Box>
    </Box>
  );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';
export default ReceiptTemplate;