module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('Socket Connected:', socket.id);

        // User joins their own room (Room Name = User ID)
        socket.on('join_room', (userId) => {
            socket.join(userId);
            console.log(`User joined room: ${userId}`);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Socket Disconnected');
        });
    });
};