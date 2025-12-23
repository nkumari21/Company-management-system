// backend/src/middleware/rbac.js

// Role hierarchy: higher number = higher privilege
const ROLE_HIERARCHY = {
    'employee': 1,
    'technical_head': 2,
    'sales_head': 2,
    'finance_head': 2,
    'co-founder': 3,
    'founder': 4
};

// Get role level
const getRoleLevel = (role) => ROLE_HIERARCHY[role] || 0;

// Check if user can view target role (higher can view lower, same level cannot view each other)
const canViewRole = (viewerRole, targetRole) => {
    const viewerLevel = getRoleLevel(viewerRole);
    const targetLevel = getRoleLevel(targetRole);
    return viewerLevel > targetLevel;
};

// Get department from role (for department heads)
const getDepartmentFromRole = (role) => {
    if (role === 'technical_head') return 'technical';
    if (role === 'sales_head') return 'sales';
    if (role === 'finance_head') return 'finance';
    return null;
};

// Check department access
const checkDepartmentAccess = async (req, res, next) => {
    const user = req.user;

    // Founder and co-founder have access to all departments
    if (user.role === 'founder' || user.role === 'co-founder') {
        req.canViewAllDepartments = true;
        return next();
    }

    // Department heads can only access their own department
    if (user.role.includes('_head')) {
        const department = getDepartmentFromRole(user.role);
        req.departmentFilter = { department };
        req.userDepartment = department;
        req.canViewAllDepartments = false;
        return next();
    }

    // Employees can only access their own data
    if (user.role === 'employee') {
        req.departmentFilter = { department: user.department };
        req.userFilter = { _id: user._id };
        req.userDepartment = user.department;
        req.canViewAllDepartments = false;
        req.selfOnly = true;
    }

    next();
};

// Strict role hierarchy check - prevents lower roles from seeing higher roles
const enforceRoleHierarchy = async (req, res, next) => {
    const user = req.user;
    req.roleFilter = {};

    // Founder can see everyone
    if (user.role === 'founder') {
        return next();
    }

    // Co-founder can see everyone except founder
    if (user.role === 'co-founder') {
        req.roleFilter = { role: { $ne: 'founder' } };
        return next();
    }

    // Department heads can only see employees in their department
    if (user.role.includes('_head')) {
        const department = getDepartmentFromRole(user.role);
        req.roleFilter = {
            role: 'employee',
            department: department
        };
        return next();
    }

    // Employees can only see themselves
    if (user.role === 'employee') {
        req.roleFilter = { _id: user._id };
        return next();
    }

    next();
};

// Validate that user can access specific target user
const canAccessUser = (currentUser, targetUser) => {
    // Founder can access anyone
    if (currentUser.role === 'founder') {
        return true;
    }

    // Co-founder can access anyone except founder
    if (currentUser.role === 'co-founder') {
        return targetUser.role !== 'founder';
    }

    // Department heads can only access employees in their department
    if (currentUser.role.includes('_head')) {
        const headDepartment = getDepartmentFromRole(currentUser.role);
        return targetUser.role === 'employee' && targetUser.department === headDepartment;
    }

    // Employees can only access themselves
    if (currentUser.role === 'employee') {
        return currentUser._id.toString() === targetUser._id.toString();
    }

    return false;
};

// Check if user can assign salary (only founder/co-founder to lower roles)
const canAssignSalary = (assignerRole, targetRole) => {
    // Only founder and co-founder can assign salary
    if (assignerRole !== 'founder' && assignerRole !== 'co-founder') {
        return false;
    }

    const assignerLevel = getRoleLevel(assignerRole);
    const targetLevel = getRoleLevel(targetRole);

    // Can only assign to lower roles
    return assignerLevel > targetLevel;
};

module.exports = {
    checkDepartmentAccess,
    enforceRoleHierarchy,
    canAccessUser,
    canAssignSalary,
    getRoleLevel,
    canViewRole,
    getDepartmentFromRole,
    ROLE_HIERARCHY
};
