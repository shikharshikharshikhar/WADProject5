const express = require('express');
const router = express.Router();

// Middleware to redirect if already authenticated
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    next();
};

// GET /auth/login - Show login form
router.get('/login', redirectIfAuthenticated, (req, res) => {
    const error = req.query.error;
    let errorMessage = null;
    
    // Handle different error types
    switch (error) {
        case 'auth_required':
            errorMessage = 'Please log in to access that page.';
            break;
        case 'invalid_credentials':
            errorMessage = 'Invalid username or password.';
            break;
        case 'user_not_found':
            errorMessage = 'No account found with that username.';
            break;
        default:
            errorMessage = null;
    }
    
    res.render('login', {
        title: 'Login',
        currentPage: 'login',
        error: errorMessage,
        username: req.query.username || ''
    });
});

// POST /auth/login - Process login
router.post('/login', redirectIfAuthenticated, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log(`Login attempt for username: ${username}`);
        
        // Validate input
        if (!username || !password) {
            return res.redirect('/auth/login?error=invalid_credentials&username=' + encodeURIComponent(username || ''));
        }
        
        // Find user in database
        const user = await req.db.findUserByUsername(username.trim());
        
        if (!user) {
            console.log(`User not found: ${username}`);
            return res.redirect('/auth/login?error=user_not_found&username=' + encodeURIComponent(username));
        }
        
        // Verify password
        const isValidPassword = await req.db.verifyPassword(password, user.passwordHash);
        
        if (!isValidPassword) {
            console.log(`Invalid password for user: ${username}`);
            return res.redirect('/auth/login?error=invalid_credentials&username=' + encodeURIComponent(username));
        }
        
        // Success - create session
        req.session.user = {
            id: user.id,
            username: user.username
        };
        
        console.log(`User logged in successfully: ${username}`);
        
        // Redirect to intended page or home
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        
        res.redirect(returnTo + '?success=' + encodeURIComponent('Welcome back, ' + user.username + '!'));
        
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/auth/login?error=server_error');
    }
});

// GET /auth/signup - Show signup form
router.get('/signup', redirectIfAuthenticated, (req, res) => {
    const error = req.query.error;
    let errorMessage = null;
    
    // Handle different error types
    switch (error) {
        case 'username_taken':
            errorMessage = 'That username is already taken. Please choose another.';
            break;
        case 'password_mismatch':
            errorMessage = 'Passwords do not match.';
            break;
        case 'invalid_input':
            errorMessage = 'Please fill in all required fields.';
            break;
        case 'username_too_short':
            errorMessage = 'Username must be at least 3 characters long.';
            break;
        case 'password_too_short':
            errorMessage = 'Password must be at least 6 characters long.';
            break;
        default:
            errorMessage = null;
    }
    
    res.render('signup', {
        title: 'Sign Up',
        currentPage: 'signup',
        error: errorMessage,
        username: req.query.username || ''
    });
});

// POST /auth/signup - Process registration
router.post('/signup', redirectIfAuthenticated, async (req, res) => {
    try {
        const { username, password, confirmPassword } = req.body;
        
        console.log(`Signup attempt for username: ${username}`);
        
        // Validate input
        if (!username || !password || !confirmPassword) {
            return res.redirect('/auth/signup?error=invalid_input');
        }
        
        // Validate username length
        if (username.trim().length < 3) {
            return res.redirect('/auth/signup?error=username_too_short&username=' + encodeURIComponent(username));
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.redirect('/auth/signup?error=password_too_short&username=' + encodeURIComponent(username));
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            return res.redirect('/auth/signup?error=password_mismatch&username=' + encodeURIComponent(username));
        }
        
        // Check if username already exists
        const existingUser = await req.db.findUserByUsername(username.trim());
        
        if (existingUser) {
            console.log(`Username already taken: ${username}`);
            return res.redirect('/auth/signup?error=username_taken&username=' + encodeURIComponent(username));
        }
        
        // Create new user
        const userId = await req.db.createUser(username.trim(), password);
        
        console.log(`User created successfully: ${username} (ID: ${userId})`);
        
        // Automatically log in the new user
        req.session.user = {
            id: userId,
            username: username.trim()
        };
        
        // Redirect to home with success message
        res.redirect('/?success=' + encodeURIComponent('Account created successfully! Welcome to Contact Manager, ' + username + '!'));
        
    } catch (error) {
        console.error('Signup error:', error);
        res.redirect('/auth/signup?error=server_error');
    }
});

// POST /auth/logout - Process logout
router.post('/logout', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'User';
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.redirect('/?error=' + encodeURIComponent('Error logging out'));
        }
        
        console.log(`User logged out: ${username}`);
        res.redirect('/?info=' + encodeURIComponent('You have been logged out successfully.'));
    });
});

// GET /auth/logout - Handle logout via GET (for convenience)
router.get('/logout', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'User';
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.redirect('/?error=' + encodeURIComponent('Error logging out'));
        }
        
        console.log(`User logged out: ${username}`);
        res.redirect('/?info=' + encodeURIComponent('You have been logged out successfully.'));
    });
});

// GET /auth/profile - Show user profile (optional feature)
router.get('/profile', (req, res) => {
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login?error=auth_required');
    }
    
    res.render('profile', {
        title: 'Profile',
        currentPage: 'profile',
        user: req.session.user,
        isAuthenticated: true
    });
});

// Middleware to check authentication (export for use in other routes)
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.session.returnTo = req.originalUrl;
        res.redirect('/auth/login?error=auth_required');
    }
};

module.exports = {
    router,
    requireAuth
};
