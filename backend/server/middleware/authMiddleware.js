const bcrypt = require("bcrypt")
const userModel = require("../api/user/userModel")

const authMiddleware = async (req, res, next) => {
    try {
        const incomingData = req.body || {}
        let validation = ""

        if (!incomingData.email) validation += " email is required"
        if (!incomingData.password) validation += " password is required"

        if (!!validation) {
            return res.json({
                status: 400,
                success: false,
                message: "validation error" + validation
            })
        }

        const email = incomingData.email.trim().toLowerCase()

        let user = await userModel.findOne({ email: email })

        if (!!user) {
            let isMatch = bcrypt.compareSync(incomingData.password, user.passwordHash)

            if (!isMatch) {
                return res.json({
                    status: 200,
                    success: false,
                    message: "Wrong Password"
                })
            }

            req.user = user
            return next()
        }

        return res.json({
            status: 404,
            success: false,
            message: "user not found"
        })
    } catch (error) {
        return res.json({
            status: 500,
            success: false,
            message: error.message
        })
    }
}

module.exports = authMiddleware
