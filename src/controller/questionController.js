const { default: mongoose } = require('mongoose')
const questionModel = require('../model/questionModel')
const answerModel = require('../model/answerModel');
const userModel = require('../model/userModel');

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
        if(mongoose.isValidObjectId(data.askedBy))
            findUser = await userModel.findById(data.askedBy)

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
            else if(isValid(data.tag) && data.tag.match(/[^-_a-zA-Z]/))
                error.push('Invalid tag(s)')
        }

        if(!isValid(data.askedBy))
            error.push('askedBy is ObjectId required')
        if(isValid(data.askedBy) && !mongoose.isValidObjectId(data.askedBy))
            error.push('Invalid askedBy ObjectId')
        if(!findUser && mongoose.isValidObjectId(data.askedBy))
            error.push('User not found')

        if(error.length == 1)
            return res.status(400).send({status: false, message: error.toString()})
        else if(error.length > 1)
            return res.status(400).send({status: false, message: error})

        if(data.askedBy != req.headers['valid-user'])
            return res.status(401).send({status: false, message: 'user not authorised.'})

        if(Array.isArray(data.tag))
        data.tag = data.tag.filter(x => x.trim())
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
            let questions = await questionModel.find({isDeleted: false}).collation({ locale: "en", strength: 2 }).sort({description: sort}).lean()
            if(!questions.length)
                return res.status(404).send({status: false, msg: "No Questions found."})
            let answers = await answerModel.find({questionId: questions, isDeleted: false}).lean()
            if(answers.length){
                for(let i in questions){
                    questions[i]['anaswers'] = "No Answers Present for this Question yet." //1st i'm assigning this string in each 'anaswers' field 
                    questions[i]['anaswers'] = answers.filter(x => x.questionId == questions[i].questionId) //if some answers found then I'm replacing 'anaswers' with the answer array
                }
            }
            return res.status(200).send({status:true, data:questions})
        }
        let questions = await questionModel.find({$or:total, isDeleted: false, isPublished: true}).collation({ locale: "en", strength: 2 }).sort({description: sort}).lean()
        if(!questions.length)
            return res.status(404).send({status: false, msg: "No Questions found."})
        let answers = await answerModel.find({questionId: questions, isDeleted: false}).lean()
        if(answers.length){
            for(let i in questions){
                questions[i]['anaswers'] = "No Answers Present for this Question yet."
                questions[i]['anaswers'] = answers.filter(x => x.questionId == questions[i].questionId)
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
        let qId = req.params.questionId

        if(!mongoose.isValidObjectId(qId))
            return res.status(400).send({status: false, message: 'Invalid Quetion Objectid.'})
        
        let question = await questionModel.findOne({_id: qId, isDeleted: false}).collation({ locale: "en", strength: 2 }).lean()
        if(!question)
            return res.status(404).send({status: false, msg: "No Questions found."})

        let answers = await answerModel.find({questionId: qId, isDeleted: false}).lean()
        if(answers.length)
            question['anaswers'] = answers
            
        question['anaswers'] = "No Answers Present for this Question yet."
        return res.status(200).send({status:true, data:question})
    }catch(err){
        console.log(err.message)
        res.status(500).send({status: false, message: err.message})
    }
}

module.exports = {createQuestion, getQuestions, getQuestionById}