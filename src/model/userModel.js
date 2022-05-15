const mongoose = require('mongoose')
const ObjectId = mongoose.SchemaTypes.ObjectId

const userSchema = new mongoose.Schema({
    fname: {type: String, required: true, trim: true},
    lname: {type: String, required: true, trim: true},
    email: {type: String, required: true, unique:true, trim: true, lowercase: true},
    phone: {type: String, unique:true, trim: true}, 
    password: {type: String, required: true}, // encrypted password
    creditScore: {type: Number, required: true},
},
    {timestamps:true})

const passwordSchema = new mongoose.Schema({
    userId: {type: ObjectId, ref: 'User', required: true},
    email: {type: String, unique:true, trim: true, lowercase: true},
    password: {type: String, required: true}
})

const userModel = mongoose.model('User', userSchema)//users
const passwordModel = mongoose.model('Password', passwordSchema)//passwords

module.exports = {userModel, passwordModel}
