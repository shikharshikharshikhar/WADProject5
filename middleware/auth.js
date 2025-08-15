// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.session.returnTo = req.originalUrl;
        res.redirect('/auth/login?error=auth_required');
    }
};

// Optional authentication - doesn't redirect, just sets user info
const optionalAuth = (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    next();
};

// Redirect if already logged in
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        next();
    }
};

// Check if user owns resource (for future use)
const checkOwnership = (req, res, next) => {
    // For now, all authenticated users can access all contacts
    // You could extend this to have user-specific contacts
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login?error=auth_required');
    }
    next();
};

module.exports = {
    requireAuth,
    optionalAuth,
    redirectIfAuthenticated,
    checkOwnership
};
