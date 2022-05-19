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
            error.push('Text for answer is required')

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
        if(findQuestion.askedBy == data.answeredBy)
            return res.status(400).send({status: false, message: "You can't answer your Own question."})

        data.answeredBy = data.answeredBy.trim()
        data.questionId = data.questionId.trim()
        let createAnswer = await answerModel.create(data)
        await userModel.findOneAndUpdate({_id: data.answeredBy},{"$inc": { creditScore: 200 } },{new: true})
        res.status(201).send({status: true, message: "Answer submitted successfully.", data: createAnswer})

    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

const getAnswers = async (req, res) => {
    try{
        let qId = req.params.questionId
        if(!mongoose.isValidObjectId(qId))
            return res.status(400).send({status: false, message: "Invalid QuestionId in params."})
        
        let checkQuestion = await questionModel.findById(qId)
        if(checkQuestion.isDeleted)
            return res.status(404).send({status: false, message: "Question not found. Would you like to post this Question instead ?"})

        let answers = await answerModel.find({questionId: qId, isDeleted: false}).sort({createdAt: -1})
        if(!answers.length)
            return res.status(404).send({status: false, message: "No answers available for this question currently."})
        
        res.status(200).send({status: true, message: answers})
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

const updateAnswer = async (req, res) => {
    let aId = req.params.answerId
    let data = req.body
    let err = [], err1 = [], errstr;
    try{
        if(!mongoose.isValidObjectId(aId.trim()))
            return res.status(400).send({status: false, message: "Invalid AnswerId in params."})    

        let findAnswer = await answerModel.findOne({_id: aId, isDeleted: false})
        if(!findAnswer)
            return res.status(404).send({status: false, message: 'Answer not found.'})
        
        if(findAnswer.answeredBy != req.headers['valid-user'])
            return res.status(401).send({status: false, message: "You're not authorized to update this answer."})
        
        if(!Object.keys(data).length)
            return res.status(400).send({status: false, message: 'Please provide your new Answer to update.'})

        Object.keys(data).forEach(x => {if(!['answeredBy', 'text', 'questionId', 'isDeleted'].includes(x)) err.push(x)})
        errstr = err.length?err.join(', ') + `${err.length>1?' are Invalid fields.':' is an Invalid field.'}`:''
        Object.keys(data).forEach(x => {if(['answeredBy', 'questionId', 'isDeleted'].includes(x)) err1.push(x)})
        errstr += err1.length?`${errstr.length?' And ':''}` + err1.join(', ') + " can't be updated.":''

        if(errstr.trim().length) 
            return res.status(400).send({status:false, message:errstr.trim()})
    
        if(!isValid(data.text))
            delete data.text
        
        let updatedAnswer = await answerModel.findOneAndUpdate({_id: aId},{text: data.text?.trim()},{new: true})
        if(!isValid(data.text))
            return res.status(200).send({status:false, message:"Since you didn't provide new answer, the answer is same as previous.", data: updateAnswer})
        res.status(201).send({status:true, message:"Successfully updated", data: updatedAnswer})

    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}


const deleteAnswer = async (req, res) => {
    let aId = req.params.answerId
    let {userId, questionId} = req.body//still confused what to with this data, research more later
    try{
        if(!mongoose.isValidObjectId(aId))
            return res.status(400).send({status: false, message: 'Invalid Answer Objectid.'})
        
        let findAnswer = await answerModel.findOne({_id: aId, isDeleted: false})
        if(!findAnswer)
            return res.status(404).send({status: false, message: 'Answer not found.'})

        if(findAnswer.answeredBy != req.headers['valid-user'])
            return res.status(400).send({status: false, message: "You're not authorized to delete this Answer."})

        let deleteAns = await answerModel.findOneAndUpdate({_id: aId},{isDeleted: true},{new: true})
            res.status(200).send({status: true, message: 'Successfully deleted.', data: deleteAns})
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

module.exports = {createAnswer, getAnswers, updateAnswer, deleteAnswer}

//check cases for 
//if a question is deleted then user shouldn't find it's relavent answers
//if user is deleted, then user shouldn't get his questions or answers