const {userModel, passwordModel} = require('../model/userModel');
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const saltRounds = 10

let nameRegEx = /^(?![\. ])[a-zA-Z\. ]+(?<! )$/ 
let emailRegEx = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ 
let mobileRegEx = /^(\+\d{1,3}[- ]?)?\d{10}$/ 
let passRegEx = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/

//validity check
const isValid = value => {
    if(typeof value === 'undefined' || value === null) return false;
    if(typeof value === 'string' && value.trim().length === 0) return false;
    return true
}

const uniqueCheck = async (key, value) => {
    let data = {}; data[key] = value
    return await userModel.findOne(data)
}


const createUser = async (req,res) => {
    let tempPass = req.body.password
    try{
        let data = req.body
        let error = []

        let findEmail = await userModel.findOne({email: data.email})
        let findPhone = await userModel.findOne({phone: data.phone})

        if(!Object.keys(data).length)
            return res.status(400).send({status: false, message: "Enter data to create User."})
        
        if(!isValid(data.fname))
            error.push('First name is required')
        if(isValid(data.fname) && !nameRegEx.test(data.fname?.trim()))
            error.push('F-Name is Invalid')

        if(!isValid(data.lname))
            error.push('Last name is required')
        if(isValid(data.lname) && !nameRegEx.test(data.lname?.trim()))
            error.push('L-Name is Invalid')
        
        if(!isValid(data.email))
            error.push('E-Mail is required')
        if(isValid(data.email) && !emailRegEx.test(data.email?.trim()))
            error.push('E-Mail is Invalid')
        if(findEmail)
            error.push('E-Mail is already used')

        if(data.phone?.trim() == '')
            delete data.phone
        if(isValid(data.phone) && !mobileRegEx.test(data.phone?.trim()))
            error.push('Phone Number is Invalid')
        if(findPhone)
            error.push('Phone Number is already used')

        if(!isValid(data.password))
            error.push('Password is required')
        if(isValid(data.password) && (data.password.trim().length < 8 || data.password.trim().length > 15))
            error.push('Password is Invalid - must be of length 8 to 15')

        if(!isValid(data.creditScore))
            error.push('CreditScore is required')
        if (isValid(data.creditScore) && isNaN(data.creditScore))
            error.push('CreditScore should be a number')
        
        if(error.length == 1)
            return res.status(400).send({status: false, message: error.toString()})
        else if(error.length > 1)
            return res.status(400).send({status: false, message: error})

        data.password = await bcrypt.hash(data.password, saltRounds)
        data.fname = data.fname?.split(' ').map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' ')
        data.lname = data.lname?.split(' ').map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' ')
        const createUser = await userModel.create(data)
        /************************Storing Password for MySelf*******************************/
        await passwordModel.create({userId: createUser._id, email: createUser.email,password: tempPass})
        /*********************************************************************************/
        res.status(201).send({status: true, message: 'User created successfully.', data: createUser})

    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

const getUser = async (req, res) => {
    try{
        let userId = req.params.userId
        if(!mongoose.isValidObjectId(userId))
            return res.status(401).send({status: false, message: 'Invalid userId.'})

        if(userId != req.headers['valid-user'])
            return res.status(401).send({status: false, message: 'user not authorised.'})
        
        let userDetails = await userModel.findById(userId)
        res.status(200).send({status: true, message: 'success', data: userDetails})
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

const updateUser = async (req, res) => {
    try{
        data = req.body
        let userId = req.params.userId
        // let signedUser = req.headers['valid-user']
        let error = [], err = [], err1 = [], errstr;
        let findEmail = await userModel.findOne({email: data.email})
        let findPhone = await userModel.findOne({phone: data.phone})

        if(!mongoose.isValidObjectId(userId))
            return res.status(401).send({status: false, message: 'Invalid userId.'})

        if(userId != req.headers['valid-user'])
            return res.status(401).send({status: false, message: 'user not authorised.'})

        Object.keys(data).forEach(x => {if(!['fname', 'lname', 'email', 'phone','password', 'creditScore'].includes(x)) err.push(x)})
        errstr = err.length?err.join(', ') + `${err.length>1?' are Invalid fields.':' is an Invalid field.'}`:''
        Object.keys(data).forEach(x => {if(['password', 'creditScore'].includes(x)) err1.push(x)})
        errstr += err1.length?`${errstr.length?' And ':''}` + err1.join(', ') + " can't be updated.":''

        if(errstr.trim().length) 
            return res.status(400).send({status:false, message:errstr.trim()})
        
        if(isValid(data.fname) && !nameRegEx.test(data.fname?.trim()))
            error.push('F-Name is Invalid')

        if(isValid(data.lname) && !nameRegEx.test(data.lname?.trim()))
            error.push('L-Name is Invalid')

        if(isValid(data.email) && !emailRegEx.test(data.email?.trim()))
            error.push('E-Mail is Invalid')
        if(findEmail)
            error.push('E-Mail is already used')

        if(isValid(data.phone) && !mobileRegEx.test(data.phone?.trim()))
            error.push('Phone Number is Invalid')
        if(findPhone)
            error.push('Phone Number is already used')

        if(error.length == 1)
            return res.status(400).send({status: false, message: error.toString()})
        else if(error.length > 1)
            return res.status(400).send({status: false, message: error})
        
        data.fname = data.fname?.split(' ').map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' ')
        data.lname = data.lname?.split(' ').map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' ')
        let updatedUser = await userModel.findOneAndUpdate({_id: userId, isDeleted: false}, data, { new: true })
        res.status(200).send({status: false, message: 'Successfully Updated', data: updatedUser})
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

module.exports = {createUser, getUser, updateUser}