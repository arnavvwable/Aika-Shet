const { supabaseAdmin } = require('./supabase');

const rooms = {};

const joinRoom = async (roomCode, user) => {
  if (!rooms[roomCode]) {
    rooms[roomCode] = { users: {} };
  }
  rooms[roomCode].users[user.userId] = { ...user, status: 'rx' };
  
  try {
    const { error } = await supabaseAdmin.from('members')
      .update({ status: 'rx', user_name: user.callsign || user.userName })
      .match({ channel_id: roomCode, user_id: user.userId });
    if (error) console.error('Supabase Join Update Error:', error.message);
  } catch (err) {
    console.error(err);
  }
};

const leaveRoom = async (roomCode, userId) => {
  if (rooms[roomCode] && rooms[roomCode].users[userId]) {
    delete rooms[roomCode].users[userId];
    if (Object.keys(rooms[roomCode].users).length === 0) {
      delete rooms[roomCode];
    }
  }
  try {
    await supabaseAdmin.from('members').update({ status: 'offline' }).match({ channel_id: roomCode, user_id: userId });
  } catch(err) {
    console.error(err);
  }
};

const setUserStatus = async (roomCode, userId, status) => {
  if (rooms[roomCode] && rooms[roomCode].users[userId]) {
    rooms[roomCode].users[userId].status = status;
  }
  try {
    await supabaseAdmin.from('members').update({ status }).match({ channel_id: roomCode, user_id: userId });
  } catch(err) {
    console.error(err);
  }
};

const getRoomUsers = (roomCode) => {
  return rooms[roomCode] ? rooms[roomCode].users : {};
};

module.exports = {
  rooms,
  joinRoom,
  leaveRoom,
  setUserStatus,
  getRoomUsers
};
