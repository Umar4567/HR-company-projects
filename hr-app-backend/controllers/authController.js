const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { sendResetEmail } = require('../utils/email');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// Registration function
const register = async (req, res) => {
  try {
    console.log('Registration attempt:', req.body);
    
    const { employeeId, name, email, password, department } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { employeeId }] 
    });

    if (userExists) {
      return res.status(400).json({ 
        message: 'User already exists with this email or employee ID' 
      });
    }

    // Create user
    const user = await User.create({
      employeeId,
      name,
      email,
      password,
      department,
      role: 'employee'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Login function
const login = async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (isPasswordValid) {
      const token = generateToken(user._id);
      // Update login tracking
      try {
        user.lastLogin = new Date();
        // get IP from request (works behind proxies if configured)
        user.lastLoginIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();
      } catch (e) {
        console.error('Failed to update login tracking:', e);
      }
      
      res.json({
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        token: token,
        lastLogin: user.lastLogin,
        lastLoginIP: user.lastLoginIP,
        loginCount: user.loginCount || 0
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: error.message 
    });
  }
};

// Get profile function
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Forgot Password - FIXED VERSION
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('Forgot password request for email:', email);

    if (!email) {
      return res.status(400).json({ 
        message: 'Please provide email address' 
      });
    }

    const user = await User.findOne({ email });
    
    // Always return success even if email doesn't exist (for security)
    if (!user) {
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token and save to database
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    console.log('Password Reset URL:', resetUrl);

    try {
      // Build email content (same as previous HTML body)
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your HR System account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 30 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Or copy and paste this link in your browser:<br>
            ${resetUrl}
          </p>
        </div>
      `;

      // Use shared mailer util which reads SMTP env vars (GMAIL_USER/GMAIL_PASS or provider)
      const info = await sendResetEmail({
        to: user.email,
        subject: 'Password Reset Request - HR System',
        html
      });

      // If running with Ethereal or test account, nodemailer may provide a preview URL
      const previewUrl = info && typeof nodemailer.getTestMessageUrl === 'function'
        ? nodemailer.getTestMessageUrl(info)
        : null;

      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        // resetUrl included only for development convenience; remove in production
        resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
        previewUrl: previewUrl
      });
    } catch (emailError) {
      console.error('Email error:', emailError);

      // Clear the reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        message: 'Error sending email. Please try again.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset request',
      error: error.message 
    });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        message: 'Please provide a new password' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Hash the token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    res.json({ 
      message: 'Password reset successfully. You can now login with your new password.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset',
      error: error.message 
    });
  }
};

// Export all functions
module.exports = {
  register,
  login,
  getProfile,
  forgotPassword,
  resetPassword
};