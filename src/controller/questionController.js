const { default: mongoose } = require('mongoose')
const questionModel = require('../model/questionModel')

//validity check
const isValid = value => {
    if(typeof value === 'undefined' || value === null) return false;
    if(typeof value === 'string' && value.trim().length === 0) return false;
    return true
}

const createQuestion = async (req,res) => {
    let data = req.body
    let error = []
    try{
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

module.exports = {createQuestion}