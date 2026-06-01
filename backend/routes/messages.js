// backend/routes/messages.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * GET /inquiries/:id/messages
 */
router.get('/:id/messages', async (req, res) => {
  try {
    // Verify user is part of this inquiry
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('tenant_id, landlord_id')
      .eq('id', req.params.id)
      .single();

    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (inquiry.tenant_id !== req.userId && inquiry.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users!sender_id(id, name, avatar_url)')
      .eq('inquiry_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('inquiry_id', req.params.id)
      .neq('sender_id', req.userId);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /inquiries/:id/messages
 */
router.post('/:id/messages', async (req, res) => {
  try {
    const { content, message_type, image_url } = req.body;
    if (!content && !image_url) {
      return res.status(400).json({ error: 'Content or image required' });
    }

    // Verify access
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('tenant_id, landlord_id, status')
      .eq('id', req.params.id)
      .single();

    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (inquiry.tenant_id !== req.userId && inquiry.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (inquiry.status === 'rejected' || inquiry.status === 'closed') {
      return res.status(400).json({ error: 'This conversation is closed' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        inquiry_id: req.params.id,
        sender_id: req.userId,
        content: content || '',
        message_type: message_type || 'text',
        image_url: image_url || null,
      })
      .select('*, sender:users!sender_id(id, name, avatar_url)')
      .single();

    if (error) throw error;

    // Real-time via Socket.io
    const io = req.app.get('io');
    io.to(`inquiry_${req.params.id}`).emit('new_message', message);

    // Notify other party via socket if not in room
    const connectedUsers = req.app.get('connectedUsers');
    const otherId = inquiry.tenant_id === req.userId ? inquiry.landlord_id : inquiry.tenant_id;
    const otherSocketId = connectedUsers.get(otherId);
    if (otherSocketId) {
      io.to(otherSocketId).emit('message_notification', {
        inquiry_id: req.params.id,
        message,
      });
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
