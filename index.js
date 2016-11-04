var express = require('express')
        , app = express()
        , http = require('http')
        , server = http.createServer(app)
        , io = require('socket.io').listen(server),
        mongoose = require('mongoose'),
        users = {};

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

    /*
    name: adduserId
    params: roomId (its a room id of users)
    */
    socket.on('adduserId', function (roomId) {
        console.log("roomId=" + roomId);
        socket.room = roomId;
        socket.join(roomId);
        var query = Chat.find({request_id: roomId});
        query.limit(10);
        query.sort('-sent').exec(function (err, docs) {
            console.log(docs);
            if (err)
                throw err;
            socket.emit('load old messages', 'sankarshan', docs);
        });
        
    });

     /*
    name: sendchat
    desciptions: when the client emits 'sendchat', this listens and executes
    params: 
    {
    data:{
    from_id: 1,
    to_id: 2,
    message: 'hello',
    cat_id: '1',
    sub_cat_id: '3',
    local_timestamp: 12343324,
    room_id: '123',
    timestamp: 1440234
    }
    }
    */
    socket.on('sendchat', function (data) {
        console.log(JSON.parse(data));
        console.log("Android="+data);
        var newChat = new Chat({from_id: data.from_id, to_id: data.to_id, message: data.message, message_type: data.message_type, cat_id: data.cat_id, sub_cat_id: data.sub_cat_id, local_timestamp: data.local_timestamp, request_id: data.room_id, room_id: data.room_id, timestamp: data.timestamp});
        newChat.save();
        // we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.in(data.room_id).emit('updatechat', socket.username, data);
    });




  
    /*
    name: userImage
    desciptions: when the client emits 'sendchat', this listens and executes
    params: 
    {
    msg:{
   imageMetaData: 'asd923asd89',
   imageData: 'asdasdasd'asdad23
    },
    client:{
    id:1
    }
    }
    */
    //for images
      socket.on('userImage', function(msg,callback){
        console.log('on user img.....');
        fs.exists(__dirname + "/" + msg.imageMetaData, function (exists) {
                  if (!exists) {
                  fs.mkdir(__dirname + "/" + msg.imageMetaData, function (e) {
                           if (!e) {
                           console.log("Created new directory without errors." + client.id);
                           } else {
                           console.log("Exception while creating new directory....");
                           throw e;
                           }
                           });
                  }
                  });
        fs.writeFile(__dirname + "/" + msg.imageMetaData + "/" + msg.imageMetaData + ".jpg",           msg.imageData, function (err) {
                     if (err) {
                     console.log('ERROR:: ' + err);
                     throw err;
                     }
                     });
        console.log('msg>>> ',msg);
    
        if(msg.toUserId in users){
        console.log(msg.toUserId);
        users[msg.toUserId].emit('user image',{image:msg.imageData, nick: socket.nickname});
        
        console.log('Whisper!');
        } else{
            console.log('***error--');
        //callback('Error!  Enter a valid user.');
        }
        //io.sockets.emit('user image',msg.imageData);
    });

      socket.on('getImgDone', function(data){
        console.log('data==============>>>',data.length);
        //delete from tbl...where({imgflg==0})0 for msgs
        //remove chat only dont remove imgs.
        for (var i = 0; i < data.length; i++) {
            //data[i]
            console.log('its i>>',data[i]._id);
            console.log('its img>>',data[i].img);
            //Chat.update({id:data[i].id},{isImgDownloaded:1}).exec();
            var conditions = {id:data._id}, update = {isImgDownloaded:1}, options = { multi: true };
            Chat.update(conditions, update, options, callback);
            function callback (err, numAffected) {
                        }
        }
    });

       /*
    name: typing
    desciptions: 
    params: 
    {
    data:{
    oppUser: 1,
    currentUser: 2
    }
    }
    */

      socket.on('typing', function(data, callback){
        if(data.oppUser in users)
        {
            users[data.oppUser].emit('typing',{oppUser:data.oppUser,currentUser:data.currentUser});
            console.log('typing ..... ');
            }
    });

        /*
    name: stopTyping
    desciptions: 
    params: 
    {
    data:{
    oppUser: 1,
    currentUser: 2
    }
    }
    */
    
    socket.on('stopTyping', function(data, callback){
        if(data.oppUser in users)
        {
            users[data.oppUser].emit('stop typing');
            console.log('Stop typing ..... ');
        }
    });


      /*
    name: shareContact
    desciptions: 
    params: 
    {
    data:{
    toUserId: 1,
    contactdetails: 2
    }
    }
    */
    socket.on('shareContact',function(data,callback){
        var dtc=JSON.stringify(data.contactdetails);
        console.log("contactdetails>>>>>>"+dtc);
        if(data.toUserId in users)
        {       
           users[data.toUserId].emit('share contact',{contact:data.contactdetails, nick: socket.nickname});
        }
        else
        {
            console.log('***error--');
        //callback('Error!  Enter a valid user.');
        }
    });  


     /*
    name: sendMessage
    desciptions: 
    params: 
    {
    data:{
    msg: 'asdasd',
    name: '1'
    }
    }
    */

    //for whisper (one to one chat)
        socket.on('sendMessage', function(data, callback){
       
        console.log('recived' + data);
        if(data.name){
           msg = data.msg;

      
                var name = data.name;
                var msg = data.msg;
                if(name in users){
                    console.log('sending message to user!');
                    users[name].emit('whisper', {msg: msg, nick: socket.nickname});
                    console.log('message sent is: ' + msg);
                    console.log('message sent nickname: ' + socket.nickname);
                    console.log('Whisper!');
                } else{
                    //insert data here
                    var newMsg = new Chat({msg: msg, img:null, nick: socket.nickname, receiver:name,imgFlag:0});
                    newMsg.save(function(err){
                        if(err) throw err;
                        io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
                    });
                    callback(false);
                }
            
        } else{
            io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
        }
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
