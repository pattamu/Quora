const { default: mongoose } = require('mongoose')
const questionModel = require('../model/questionModel')
const answerModel = require('../model/answerModel');
const {userModel} = require('../model/userModel');

//validity check
const isValid = value => {
    if(typeof value === 'undefined' || value === null) return false;
    if(typeof value === 'string' && value.trim().length === 0) return false;
    return true
}

const createAnswer = async (req, res) => {
    let data = req.body, findUser, findQuestion
    let error = []
    try{
        if(mongoose.isValidObjectId(data.answeredBy.trim()))
            findUser = await userModel.findById(data.answeredBy.trim())

        if(mongoose.isValidObjectId(data.questionId.trim()))
            findQuestion = await questionModel.findById(data.questionId.trim())

        if(!Object.keys(data).length)
            return res.status(400).send({status: false, message: "Enter your answer details."})

        if(!isValid(data.answeredBy))
            error.push('AnsweredBy is required')
        if(isValid(data.answeredBy) && !mongoose.isValidObjectId(data.answeredBy.trim()))
            error.push('Invalid AnsweredBy ObjectId')
        if(mongoose.isValidObjectId(data.answeredBy.trim()) && !findUser)
            error.push('User not found')

        if(!isValid(data.text))
            error.push('Test for answer is required')

        if(!isValid(data.questionId))
            error.push('questionId is required')
        if(isValid(data.questionId) && !mongoose.isValidObjectId(data.questionId.trim()))
            error.push('Invalid questionId')
        if(mongoose.isValidObjectId(data.questionId.trim()) && !findQuestion)
            error.push('Question not found')

        if(error.length == 1)
            return res.status(400).send({status: false, message: error.toString()})
        else if(error.length > 1)
            return res.status(400).send({status: false, message: error})

        if(data.answeredBy != req.headers['valid-user'])
            return res.status(401).send({status: false, message: 'user not authorised.'})

        let createAnswer = await answerModel.create(data)
        res.status(201).send({status: true, message: "Answer submitted successfully.", data: createAnswer})

    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

module.exports = {createAnswer}