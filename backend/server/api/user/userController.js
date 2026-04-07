const userModel = require("./userModel")
const bcrypt = require("bcrypt")

const getUsers = async (req, res) => {
    try {
        let users = await userModel.find().select("-passwordHash").sort({ createdAt: -1 })

        res.json({
            status: 200,
            success: true,
            count: users.length,
            data: users
        })
    } catch (error) {
        res.json({
            status: 500,
            success: false,
            message: error.message
        })
    }
}

const registerUser = async (req, res) => {
    try {
        const incomingData = req.body || {}
        let validation = ""

        if (!incomingData.name) validation += " name is required"
        if (!incomingData.email) validation += " email is required"
        if (!incomingData.phone) validation += " phone is required"
        if (!incomingData.password) validation += " password is required"

        if (!!validation) {
            return res.json({
                status: 400,
                success: false,
                message: "validation error" + validation
            })
        }

        const email = incomingData.email.trim().toLowerCase()
        const phone = incomingData.phone.trim()

        let existingUser = await userModel.findOne({
            $or: [{ email: email }, { phone: phone }]
        })

        if (!!existingUser) {
            let duplicateMessage = "user already exists"

            if (existingUser.email === email) duplicateMessage = "email already registered"
            if (existingUser.phone === phone) duplicateMessage = "phone already registered"

            return res.json({
                status: 400,
                success: false,
                message: duplicateMessage
            })
        }

        let hashedPassword = bcrypt.hashSync(incomingData.password, 10)

        let user = await userModel.create({
            name: incomingData.name.trim(),
            email: email,
            phone: phone,
            passwordHash: hashedPassword,
            role: "traveler",
            governmentIdUrl: incomingData.governmentIdUrl ? incomingData.governmentIdUrl.trim() : ""
        })

        res.json({
            status: 200,
            success: true,
            message: "user registered successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                verificationStatus: user.verificationStatus,
                governmentIdUrl: user.governmentIdUrl,
                trustScore: user.trustScore,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        })
    } catch (error) {
        res.json({
            status: 500,
            success: false,
            message: error.message
        })
    }
}

const login = async (req, res) => {
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

        if (!user) {
            return res.json({
                status: 404,
                success: false,
                message: "user not found"
            })
        } else {
            let isMatch = bcrypt.compareSync(incomingData.password, user.passwordHash)

            if (isMatch) {
                return res.json({
                    status: 200,
                    success: true,
                    message: "Login Success",
                    data: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                        verificationStatus: user.verificationStatus,
                        governmentIdUrl: user.governmentIdUrl,
                        trustScore: user.trustScore,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt
                    }
                })
            } else {
                return res.json({
                    status: 200,
                    success: false,
                    message: "Wrong Password"
                })
            }
        }
    } catch (error) {
        return res.json({
            status: 500,
            success: false,
            message: error.message
        })
    }
}

module.exports = { getUsers, registerUser, loginUser: login }
