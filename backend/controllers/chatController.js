import Message from '../models/Message.js';
import User from '../models/User.js';

const chatController = {
    // Send a new message
    sendMessage: async (req, res) => {
        try {
            const { recipientId, content } = req.body;
            const senderId = req.user.id;

            const newMessage = new Message({
                sender: senderId,
                recipient: recipientId,
                content,
                timestamp: new Date(),
                read: false
            });

            const savedMessage = await newMessage.save();
            
            // Populate sender and recipient info
            const populatedMessage = await Message.findById(savedMessage._id)
                .populate('sender', 'username avatar')
                .populate('recipient', 'username avatar');

            res.status(200).json(populatedMessage);
        } catch (err) {
            res.status(500).json({ message: "Error sending message", error: err.message });
        }
    },

    // Get conversation with specific user
    getConversation: async (req, res) => {
        try {
            const userId = req.user.id;
            const otherUserId = req.params.userId;

            const messages = await Message.find({
                $or: [
                    { sender: userId, recipient: otherUserId },
                    { sender: otherUserId, recipient: userId }
                ]
            })
            .sort({ timestamp: 1 })
            .populate('sender', 'username avatar')
            .populate('recipient', 'username avatar');

            res.status(200).json(messages);
        } catch (err) {
            res.status(500).json({ message: "Error fetching conversation", error: err.message });
        }
    },

    // Get all conversations
    getConversations: async (req, res) => {
        try {
            const userId = req.user.id;

            // Get the last message from each conversation
            const conversations = await Message.aggregate([
                {
                    $match: {
                        $or: [
                            { sender: userId },
                            { recipient: userId }
                        ]
                    }
                },
                {
                    $sort: { timestamp: -1 }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$sender", userId] },
                                "$recipient",
                                "$sender"
                            ]
                        },
                        lastMessage: { $first: "$$ROOT" }
                    }
                }
            ]);

            // Populate user information
            const populatedConversations = await Promise.all(
                conversations.map(async (conv) => {
                    const otherUser = await User.findById(conv._id).select('username avatar');
                    return {
                        user: otherUser,
                        lastMessage: conv.lastMessage
                    };
                })
            );

            res.status(200).json(populatedConversations);
        } catch (err) {
            res.status(500).json({ message: "Error fetching conversations", error: err.message });
        }
    },

    // Mark messages as read
    markAsRead: async (req, res) => {
        try {
            const { senderId } = req.body;
            const recipientId = req.user.id;

            await Message.updateMany(
                { 
                    sender: senderId,
                    recipient: recipientId,
                    read: false
                },
                { read: true }
            );

            res.status(200).json({ message: "Messages marked as read" });
        } catch (err) {
            res.status(500).json({ message: "Error marking messages as read", error: err.message });
        }
    },

    // Get unread message count
    getUnreadCount: async (req, res) => {
        try {
            const userId = req.user.id;

            const count = await Message.countDocuments({
                recipient: userId,
                read: false
            });

            res.status(200).json({ unreadCount: count });
        } catch (err) {
            res.status(500).json({ message: "Error getting unread count", error: err.message });
        }
    },

    // Get users available for chat
    getChatUsers: async (req, res) => {
        try {
            const currentUserId = req.user.id;
            
            // Find all users except the current user
            const users = await User.find({ 
                _id: { $ne: currentUserId } 
            })
            .select('username avatar lastActive')
            .sort({ lastActive: -1 });

            res.status(200).json(users);
        } catch (err) {
            res.status(500).json({ message: "Error fetching chat users", error: err.message });
        }
    }
};

export default chatController;
