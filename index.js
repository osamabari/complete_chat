var express = require('express')
        , app = express()
        , http = require('http')
        , server = http.createServer(app)
        , io = require('socket.io').listen(server),
        mongoose = require('mongoose');

server.listen(3000);


mongoose.connect('mongodb://localhost/chatData', function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected to mongodb!');
    }
});
//tc.from_user_id as from_id,tc.to_user_id as to_id,if(message_type="","text",if(message_type="1","text",if(tc.message_type="2","audio","image"))) as message_type,tc.message as message,tc.sent as timestamp,tc.category_id as cat_id,tc.sub_category_id as sub_cat_id,tc.request_id as request_id,if(tu.name IS NULL,"",tu.name) as fromName,if(tu2.name IS NULL,"",tu2.name) as toName,tc.sent as local_timestamp,tc.message_type as web_message_type
var chatSchema = mongoose.Schema({
    from_id: Number, //senderId
    to_id: Number, //receiverId
    message: String,
    message_type: Number,
    cat_id: Number,
    sub_cat_id: Number,
    sent: {type: Date, default: Date.now},
    local_timestamp: Number,
    request_id: Number,
    room_id: Number,
    timestamp: Number,
});
var Chat = mongoose.model('MessageNew', chatSchema);



// usernames which are currently connected to the chat
var usernames = {};
var userIds = {};
var clients = [];
// rooms which are currently available in chat
var clientInfo = {};
io.sockets.on('connection', function (socket) {

    //console.log(socket);

    socket.on('adduserId', function (userIds) {
        console.log("Userid=" + userIds);
        socket.room = userIds;
        socket.join(userIds);
        var query = Chat.find({request_id: userIds});
        query.limit(10);
        query.sort('-sent').exec(function (err, docs) {
            console.log(docs);
            if (err)
                throw err;
            socket.emit('load old messages', 'sankarshan', docs);
        });
        
    });


    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
        console.log(JSON.parse(data));
        console.log("Android="+data);
        var newChat = new Chat({from_id: data.from_id, to_id: data.to_id, message: data.message, message_type: data.message_type, cat_id: data.cat_id, sub_cat_id: data.sub_cat_id, local_timestamp: data.local_timestamp, request_id: data.room_id, room_id: data.room_id, timestamp: data.timestamp});
        newChat.save();
        // we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.in(data.room_id).emit('updatechat', socket.username, data);
    });




    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        // remove the username from global usernames list
        delete usernames[socket.username];
        // update list of users in chat, client-side
        io.sockets.emit('updateusers', usernames);
        // echo globally that this client has left
        //socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
        socket.leave(socket.room);
    });
});
