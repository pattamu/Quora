const { default: mongoose } = require('mongoose')
const questionModel = require('../model/questionModel')
const answerModel = require('../model/answerModel');
const {userModel} = require('../model/userModel');
const { findOneAndUpdate } = require('../model/questionModel');

//validity check
const isValid = value => {
    if(typeof value === 'undefined' || value === null) return false;
    if(typeof value === 'string' && value.trim().length === 0) return false;
    return true
}

const createQuestion = async (req,res) => {
    let data = req.body, findUser
    let error = []
    try{
        if(mongoose.isValidObjectId(data.askedBy.trim()))
            findUser = await userModel.findById(data.askedBy.trim())

        if(!Object.keys(data).length)
            return res.status(400).send({status: false, message: "Enter your Qestion details."})

        if(!isValid(data.description))
            error.push('description is required')
        
        if(data.hasOwnProperty('tag')){
            if(Array.isArray(data.tag)){
                if(!data.tag.some(x => x.trim()) || data.tag.some(x => x.trim().match(/[^-_a-zA-Z]/)))
                    error.push('Invalid tag(s)')
            }else if(!isValid(data.tag))
                error.push('tag is required')
            else if(isValid(data.tag) && data.tag.trim().match(/[^-_a-zA-Z]/))
                error.push('Invalid tag(s)')
        }

        if(!isValid(data.askedBy))
            error.push('askedBy is ObjectId required')
        if(isValid(data.askedBy) && !mongoose.isValidObjectId(data.askedBy.trim()))
            error.push('Invalid askedBy ObjectId')
        if(mongoose.isValidObjectId(data.askedBy.trim()) && !findUser)
            error.push('User not found')

        if(error.length == 1)
            return res.status(400).send({status: false, message: error.toString()})
        else if(error.length > 1)
            return res.status(400).send({status: false, message: error})

        if(data.askedBy.trim() != req.headers['valid-user'])
            return res.status(401).send({status: false, message: 'user not authorised.'})

        if(Array.isArray(data.tag))
        data.tag = data.tag.filter(x => x.trim())
        data.askedBy = data.askedBy.trim()
        const createQuestion = await questionModel.create(data)
        res.status(201).send({status: true, message: 'Question posted successfully.', data: createQuestion})

    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }

}

const getQuestions = async (req, res) => {
    try{
        let tag, sort

        if(req.query.tag)
            tag = (req.query.tag.split(/[, '"+-;]+/)).map(x => x.trim()).map(x => {return {tag:x}})
        
        if(isValid(req.query.askedBy) && !mongoose.isValidObjectId(req.query.askedBy))
            delete req.query.askedBy

        let total = [...tag||[],{askedBy:req.query.askedBy||null}]

        if(isValid(req.query.sort) && req.query.sort.trim() == 'descending') sort = -1
        else sort = 1

        delete req.query.sort

        if(!Object.keys(req.query).length){
            let questions = await questionModel.find({isDeleted: false}).collation({ locale: "en", strength: 2 }).sort({createdAt: sort}).lean()
            if(!questions.length)
                return res.status(404).send({status: false, msg: "No Questions found."})
            let answers = await answerModel.find({questionId: questions, isDeleted: false},{isDeleted:0,createdAt:0,updatedAt:0,__v:0}).lean()
            if(answers.length){
                for(let i in questions){
                    questions[i]['answers'] = answers.filter(x => x.questionId.toString() == questions[i]._id)
                    if(!questions[i]['answers'].length)
                        questions[i]['answers'] = "No Answers Present for this Question yet."
                }
            }
            return res.status(200).send({status:true, data:questions})
        }
        let questions = await questionModel.find({$or:total, isDeleted: false, isPublished: true}).collation({ locale: "en", strength: 2 }).sort({createdAt: sort}).lean()
        if(!questions.length)
            return res.status(404).send({status: false, msg: "No Questions found."})
        let answers = await answerModel.find({questionId: questions, isDeleted: false},{isDeleted:0,createdAt:0,updatedAt:0,__v:0}).lean()
        if(answers.length){
            for(let i in questions){
                questions[i]['answers'] = answers.filter(x => x.questionId.toString() == questions[i]._id)
                if(!questions[i]['answers'].length)
                    questions[i]['answers'] = "No Answers Present for this Question yet."
            }
        }
        return res.status(200).send({status:true, data:questions})
        
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

const getQuestionById = async (req, res) => {
    try{
        let qId = req.params.questionId.trim()

        if(!mongoose.isValidObjectId(qId))
            return res.status(400).send({status: false, message: 'Invalid Quetion Objectid.'})
        
        let question = await questionModel.findOne({_id: qId, isDeleted: false}).collation({ locale: "en", strength: 2 }).lean()
        if(!question)
            return res.status(404).send({status: false, msg: "No Questions found."})

        let answers = await answerModel.find({questionId: qId, isDeleted: false}).lean()
        if(answers.length)
            question['answers'] = answers
            
        question['answers'] = "No Answers Present for this Question yet."
        return res.status(200).send({status:true, data:question})
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

const updateQuestion = async (req, res) => {
    let data = req.body
    let qId = req.params.questionId.trim()
    let err = [], err1 = [], errstr;
    try{
        if(!mongoose.isValidObjectId(qId))
            return res.status(400).send({status: false, message: 'Invalid Quetion Objectid.'})
        
        let findQuestion = await questionModel.findOne({_id: qId, isDeleted: false})
        
        if(!findQuestion)
            return res.status(400).send({status: false, message: 'Question not found.'})

        if(findQuestion.askedBy != req.headers['valid-user'])
            return res.status(400).send({status: false, message: "You're not authorized to update this Question."})
        
        if(!Object.keys(data).length)
            return res.status(400).send({status: false, message: "You didn't provide any data to update."})

        Object.keys(data).forEach(x => {if(!['description', 'tag', 'askedBy'].includes(x)) err.push(x)})
        errstr = err.length?err.join(', ') + `${err.length>1?' are Invalid fields.':' is an Invalid field.'}`:''
        Object.keys(data).forEach(x => {if(['askedBy'].includes(x)) err1.push(x)})
        errstr += err1.length?`${errstr.length?' And ':''}` + err1.join(', ') + " can't be updated.":''

        if(errstr.trim().length) 
            return res.status(400).send({status:false, message:errstr.trim()})
        
        if(!isValid(data.description))
            delete data.description

        if(data.hasOwnProperty('tag')){
            if(Array.isArray(data.tag)){
                if(!data.tag.some(x => x.trim()))
                    delete data.tag
                else if(data.tag.some(x => x.trim().match(/[^-_a-zA-Z]/)))
                    return res.status(400).send({status: false, message: 'Invalid tag(s)'})
            }else if(!isValid(data.tag))
                delete data.tag
            else if(isValid(data.tag) && data.tag.trim().match(/[^-_a-zA-Z]/))
                return res.status(400).send({status: false, message: 'Invalid tag(s)'})
        }

        if(Array.isArray(data.tag))
            data.tag = data.tag.filter(x => x.trim()).map(x => x.trim())
        else if(isValid(data.tag))
            data.tag = [data.tag.trim()]
        
        let updatedQuestion = await questionModel.findOneAndUpdate({_id: qId, isDeleted: false}, 
                                                                    {description: data.description,
                                                                    $addToSet: {tag: {$each:data.tag||[]}}}, 
                                                                    { new: true })
        res.status(200).send({status: true, message: 'Successfully Updated', data: updatedQuestion})
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

const deleteQuestion = async (req, res) => {
    let qId =  req.params.questionId.trim()
    try{
        if(!mongoose.isValidObjectId(qId))
            return res.status(400).send({status: false, message: 'Invalid Quetion Objectid.'})
        
        let findQuestion = await questionModel.findOne({_id: qId, isDeleted: false})
        if(!findQuestion)
            return res.status(404).send({status: false, message: 'Question not found.'})

        if(findQuestion.askedBy != req.headers['valid-user'])
            return res.status(400).send({status: false, message: "You're not authorized to delete this Question."})
        
        let deleteQ = await questionModel.findOneAndUpdate({_id: qId},{isDeleted: true},{new: true})
        res.status(200).send({status: true, message: 'Successfully deleted.', data: deleteQ})
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

module.exports = {createQuestion, getQuestions, getQuestionById, updateQuestion, deleteQuestion}