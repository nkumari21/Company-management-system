// // // backend/src/middleware/auth.js

// // const jwt = require('jsonwebtoken');
// // const User = require('../models/User');

// // const protect = async (req, res, next) => {
// //     let token;

// //     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
// //         token = req.headers.authorization.split(' ')[1];
// //     }

// //     if (!token) {
// //         return res.status(401).json({
// //             success: false,
// //             message: 'Not authorized to access this route'
// //         });
// //     }

// //     try {
// //         const decoded = jwt.verify(token, process.env.JWT_SECRET);
// //         const user = await User.findById(decoded.id);

// //         if (!user) {
// //             return res.status(401).json({
// //                 success: false,
// //                 message: 'User no longer exists'
// //             });
// //         }

// //         req.user = user;
// //         next();
// //     } catch (err) {
// //         return res.status(401).json({
// //             success: false,
// //             message: 'Not authorized to access this route'
// //         });
// //     }
// // };

// // const authorize = (...roles) => {
// //     return (req, res, next) => {
// //         if (!roles.includes(req.user.role)) {
// //             return res.status(403).json({
// //                 success: false,
// //                 message: `User role ${req.user.role} is not authorized to access this route`
// //             });
// //         }
// //         next();
// //     };
// // };

// // module.exports = { protect, authorize };

// // backend/src/middleware/auth.js

// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const Attendance = require('../models/Attendance'); // Add this line

// const protect = async (req, res, next) => {
//     let token;

//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//         token = req.headers.authorization.split(' ')[1];
//     }

//     if (!token) {
//         return res.status(401).json({
//             success: false,
//             message: 'Not authorized to access this route'
//         });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const user = await User.findById(decoded.id);

//         if (!user) {
//             return res.status(401).json({
//                 success: false,
//                 message: 'User no longer exists'
//             });
//         }

//         req.user = user;
        
//         // Add auto logout attendance update
//         req.on('end', async () => {
//             if (req.path === '/api/auth/logout' && req.user) {
//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);
                
//                 await Attendance.findOneAndUpdate(
//                     {
//                         user: req.user._id,
//                         date: today,
//                         logoutTime: { $exists: false }
//                     },
//                     {
//                         logoutTime: new Date()
//                     }
//                 );
//             }
//         });
        
//         next();
//     } catch (err) {
//         return res.status(401).json({
//             success: false,
//             message: 'Not authorized to access this route'
//         });
//     }
// };

// const authorize = (...roles) => {
//     return (req, res, next) => {
//         if (!roles.includes(req.user.role)) {
//             return res.status(403).json({
//                 success: false,
//                 message: `User role ${req.user.role} is not authorized to access this route`
//             });
//         }
//         next();
//     };
// };

// module.exports = { protect, authorize };

// backend/src/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // For multipart/form-data requests, consume body to prevent ECONNRESET
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
            req.resume();
            await new Promise((resolve) => req.on('end', resolve));
        }
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        // For multipart/form-data requests, consume body to prevent ECONNRESET
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
            req.resume();
            await new Promise((resolve) => req.on('end', resolve));
        }
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };