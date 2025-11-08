// server/routes/auth.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { User, Session } = require('../models/User');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  }
});

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Environment variables
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'codeguardian-pro-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// GitHub OAuth configuration
const GITHUB_OAUTH_CONFIG = {
  clientId: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  authorizationURL: 'https://github.com/login/oauth/authorize',
  tokenURL: 'https://github.com/login/oauth/access_token',
  userAPI: 'https://api.github.com/user',
  scope: 'user:email,repo'
};

/**
 * @route   GET /api/auth/github
 * @desc    Initiate GitHub OAuth flow
 * @access  Public
 */
router.get('/github', (req, res) => {
  try {
    const state = generateRandomState();
    
    // Store state in session for security validation
    req.session.oauthState = state;
    
    const authURL = `${GITHUB_OAUTH_CONFIG.authorizationURL}?${new URLSearchParams({
      client_id: GITHUB_OAUTH_CONFIG.clientId,
      redirect_uri: `${BACKEND_URL}/api/auth/github/callback`,
      scope: GITHUB_OAUTH_CONFIG.scope,
      state: state,
      allow_signup: 'true'
    })}`;

    res.json({
      success: true,
      url: authURL,
      state: state
    });
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate GitHub authentication'
    });
  }
});

/**
 * @route   GET /api/auth/github/callback
 * @desc    GitHub OAuth callback handler
 * @access  Public
 */
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Validate state parameter
    if (!state || state !== req.session.oauthState) {
      return res.redirect(`${FRONTEND_URL}/auth?error=invalid_state`);
    }

    // Clear the state from session
    delete req.session.oauthState;

    if (!code) {
      return res.redirect(`${FRONTEND_URL}/auth?error=authorization_denied`);
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      GITHUB_OAUTH_CONFIG.tokenURL,
      {
        client_id: GITHUB_OAUTH_CONFIG.clientId,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: `${BACKEND_URL}/api/auth/github/callback`
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    const { access_token, error } = tokenResponse.data;

    if (error) {
      console.error('GitHub token exchange error:', error);
      return res.redirect(`${FRONTEND_URL}/auth?error=token_exchange_failed`);
    }

    // Get user profile from GitHub
    const userResponse = await axios.get(GITHUB_OAUTH_CONFIG.userAPI, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json'
      }
    });

    const githubUser = userResponse.data;

    // Get user emails
    const emailsResponse = await axios.get(`${GITHUB_OAUTH_CONFIG.userAPI}/emails`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json'
      }
    });

    const emails = emailsResponse.data;
    const primaryEmail = emails.find(email => email.primary) || emails[0];

    // Find or create user in database
    let user = await User.findOne({ githubId: githubUser.id });

    if (!user) {
      user = new User({
        githubId: githubUser.id,
        username: githubUser.login,
        email: primaryEmail?.email || `${githubUser.login}@users.noreply.github.com`,
        profile: {
          name: githubUser.name,
          avatar: githubUser.avatar_url,
          bio: githubUser.bio,
          company: githubUser.company,
          location: githubUser.location,
          blog: githubUser.blog,
          githubUrl: githubUser.html_url
        },
        preferences: {
          theme: 'dark',
          notifications: true,
          autoSave: true
        },
        subscription: {
          plan: 'free',
          features: ['basic_analysis', 'file_upload', 'project_management']
        }
      });
    } else {
      // Update user profile
      user.username = githubUser.login;
      user.email = primaryEmail?.email || user.email;
      user.profile = {
        name: githubUser.name,
        avatar: githubUser.avatar_url,
        bio: githubUser.bio,
        company: githubUser.company,
        location: githubUser.location,
        blog: githubUser.blog,
        githubUrl: githubUser.html_url
      };
      user.lastLogin = new Date();
    }

    await user.save();

    // Create session
    const session = new Session({
      userId: user._id,
      token: access_token,
      provider: 'github',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    await session.save();

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user._id,
        githubId: user.githubId,
        username: user.username,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set HTTP-only cookie
    res.cookie('auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Redirect to frontend with success
    res.redirect(`${FRONTEND_URL}/dashboard?auth=success`);
    
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/auth?error=authentication_failed`);
  }
});

/**
 * @route   POST /api/auth/guest
 * @desc    Create guest user session
 * @access  Public
 */
router.post('/guest', async (req, res) => {
  try {
    const { guestId } = req.body;

    // Create guest user
    const guestUser = new User({
      githubId: `guest_${guestId || Date.now()}`,
      username: `guest_${Math.random().toString(36).substr(2, 9)}`,
      email: `guest_${Date.now()}@codeguardian.local`,
      profile: {
        name: 'Guest User',
        avatar: '/images/default-avatar.png'
      },
      isGuest: true,
      preferences: {
        theme: 'dark',
        notifications: false,
        autoSave: true
      },
      subscription: {
        plan: 'guest',
        features: ['basic_analysis', 'file_upload']
      }
    });

    await guestUser.save();

    // Generate JWT token for guest
    const jwtToken = jwt.sign(
      {
        userId: guestUser._id,
        guestId: guestUser.githubId,
        username: guestUser.username,
        isGuest: true
      },
      JWT_SECRET,
      { expiresIn: '24h' } // Guest sessions shorter
    );

    res.json({
      success: true,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        email: guestUser.email,
        profile: guestUser.profile,
        isGuest: true,
        preferences: guestUser.preferences,
        subscription: guestUser.subscription
      },
      token: jwtToken
    });
  } catch (error) {
    console.error('Guest authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create guest session'
    });
  }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token and get user data
 * @access  Private
 */
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        profile: user.profile,
        preferences: user.preferences,
        subscription: user.subscription,
        isGuest: user.isGuest,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear session
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Clear HTTP-only cookie
    res.clearCookie('auth_token');

    // Remove session from database
    await Session.deleteMany({ userId: req.user.userId });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.userId })
      .select('provider createdAt expiresAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session._id,
        provider: session.provider,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isActive: session.expiresAt > new Date()
      }))
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user.userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    await Session.deleteOne({ _id: sessionId });

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
});

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: {
      id: req.user.userId,
      username: req.user.username,
      isGuest: req.user.isGuest
    }
  });
});

// Helper function to generate random state
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Also check cookies
    const cookieToken = req.cookies?.auth_token;
    if (cookieToken) {
      req.token = cookieToken;
    } else {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }
  } else {
    req.token = token;
  }

  try {
    const decoded = jwt.verify(req.token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

module.exports = router;