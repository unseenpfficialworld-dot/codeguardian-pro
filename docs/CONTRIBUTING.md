Contributing to CodeGuardian Pro

🎯 How to Contribute (योगदान कैसे करें)

हमें आपका contribution बहुत खुशी होगी! चाहे आप developer हों, designer हों, या documentation में help करना चाहते हों।

📋 Table of Contents

· Code of Conduct
· Getting Started
· Development Workflow
· Code Standards
· Pull Request Process
· Bug Reports
· Feature Requests
· Community

📜 Code of Conduct

हमारे community के सभी members के लिए Code of Conduct follow करना जरूरी है। हर किसी के साथ respect और professionalism के साथ behave करें।

🚀 Getting Started

Prerequisites (जरूरी चीजें)

· Node.js 18 or higher
· Git
· GitHub account

First Time Setup (पहली बार Setup)

```bash
# 1. GitHub पर project fork करें
# 'Fork' button click करें

# 2. अपने computer पर clone करें
git clone https://github.com/YOUR_USERNAME/codeguardian-pro.git
cd codeguardian-pro

# 3. Setup development environment
npm install
cp .env.example .env.local
npm run dev

# 4. Main repository को upstream set करें
git remote add upstream https://github.com/original-owner/codeguardian-pro.git
```

Development Server Start करें

```bash
# Frontend development (http://localhost:3000)
npm run dev

# Backend development (http://localhost:5000)  
npm run dev:server

# Both together
npm run dev:full
```

🔄 Development Workflow

Step 1: Issue चुनें

· Issues page पर जाएं
· "good first issue" label वाले issues beginners के लिए अच्छे हैं
· कोई issue assign करने के लिए comment करें

Step 2: Branch बनाएं

```bash
# Main branch से update लें
git checkout main
git pull upstream main

# New branch बनाएं
git checkout -b feature/your-feature-name
# OR
git checkout -b fix/issue-number-description
```

Branch Naming Convention:

· feature/login-page - New features के लिए
· fix/header-responsive - Bugs fix करने के लिए
· docs/api-documentation - Documentation के लिए
· style/button-colors - CSS/styling के लिए

Step 3: Code लिखें

· अपना code लिखें
· Tests लिखें
· Documentation update करें

Step 4: Test करें

```bash
# All tests run करें
npm test

# Specific test file
npm test -- components/Button.test.tsx

# Test coverage check करें
npm run test:coverage

# Linting check
npm run lint

# Type checking
npm run type-check
```

Step 5: Commit करें

```bash
# Changes add करें
git add .

# Commit करें (conventional commits use करें)
git commit -m "feat: add user authentication page"
```

Commit Message Format:

```
type: description

[optional body]

[optional footer]
```

Types:

· feat: New feature
· fix: Bug fix
· docs: Documentation
· style: Formatting, missing semi-colons, etc.
· refactor: Code refactoring
· test: Adding tests
· chore: Build process or auxiliary tool changes

Step 6: Push और Pull Request बनाएं

```bash
# अपने branch पर push करें
git push origin your-branch-name

# GitHub पर जाएं और Pull Request create करें
```

💻 Code Standards

TypeScript Standards

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const getUser = async (userId: string): Promise<User> => {
  // implementation
}

// ❌ Avoid
function getUser(userId) {
  // no types
}
```

React Components

```tsx
// ✅ Good - Functional components with TypeScript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  onClick,
  children
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ❌ Avoid - Class components, any types
```

File Naming

· Components: PascalCase.tsx (UserProfile.tsx)
· Utilities: camelCase.ts (formatDate.ts)
· Constants: UPPER_SNAKE_CASE.ts (API_ENDPOINTS.ts)
· Styles: kebab-case.css (user-profile.css)

Import Order

```typescript
// 1. React and external libraries
import React from 'react';
import { useRouter } from 'next/router';

// 2. Internal utilities
import { formatDate } from '@/utils/helpers';

// 3. Components
import { Button } from '@/components/Button';

// 4. Styles
import './styles.css';
```

🔧 Pull Request Process

PR Template Follow करें

जब आप PR create करेंगे, automatically template load होगा। उसे properly fill करें:

```markdown
## Description
[Clearly describe what this PR does]

## Related Issues
[Link to issues this PR addresses]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing performed

## Screenshots (if applicable)
[Add screenshots for UI changes]
```

PR Requirements

1. Code Quality
   · TypeScript types properly defined
   · No ESLint errors
   · Prettier formatting applied
   · Tests added/updated
2. Functionality
   · Feature works as expected
   · No breaking changes
   · Error handling implemented
3. Documentation
   · Code comments added
   · README updated if needed
   · API docs updated

Review Process

1. Automated Checks
   · GitHub Actions run automatically
   · Tests must pass
   · Code coverage maintained
   · No TypeScript errors
2. Manual Review
   · Maintainers code review करेंगे
   · Feedback मिल सकता है
   · Changes requested हो सकते हैं
3. Approval और Merge
   · Minimum 1 approval required
   · Squash merge किया जाएगा
   · Commit history clean रहेगा

🐛 Bug Reports

Bug Report Template Use करें

```markdown
## Description
[Clear description of the bug]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [See error]

## Expected Behavior
[What should happen]

## Actual Behavior  
[What actually happens]

## Environment
- OS: [e.g., Windows, macOS]
- Browser: [e.g., Chrome, Firefox]
- Version: [e.g., 1.0.0]

## Screenshots/Logs
[If applicable]
```

💡 Feature Requests

Feature Request Template

```markdown
## Problem Statement
[What problem are you trying to solve?]

## Proposed Solution
[How should this work?]

## Alternative Solutions
[Other ways to solve this problem]

## Additional Context
[Screenshots, examples, etc.]
```

🎨 Design Contributions

UI/UX Guidelines

1. Design System Follow करें
   · Use existing color palette
   · Follow component patterns
   · Maintain consistency
2. Responsive Design
   · Mobile-first approach
   · Test on different screen sizes
   · Accessibility considerations
3. Assets
   · SVG format preferred
   · Optimize images
   · Proper file naming

📚 Documentation

Documentation Types

1. Code Documentation
   · JSDoc comments for functions
   · TypeScript interfaces
   · README files for components
2. User Documentation
   · Setup guides
   · Usage instructions
   · Troubleshooting guides
3. API Documentation
   · Endpoint descriptions
   · Request/response examples
   · Authentication details

Writing Good Documentation

```markdown
# Clear Heading

Brief description.

## Steps
1. Step one
2. Step two

## Example
```code
example code
```

Notes

Additional information.

```

## 🧪 Testing

### Test Coverage Expectations

- Components: 80%+ coverage
- Utilities: 90%+ coverage  
- API routes: 85%+ coverage
- Critical features: 95%+ coverage

### Writing Tests

```typescript
// Component Test Example
describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

🤝 Community

Communication Channels

· GitHub Discussions: Questions and ideas
· Discord/Slack: Real-time communication
· Issue Tracker: Bugs and feature requests
· Weekly Meetings: Community calls (optional)

Getting Help

1. Check existing documentation
2. Search closed issues
3. Ask in GitHub discussions
4. Join community chat

Recognition

· Contributors list में नाम add होगा
· Special badges for active contributors
· Featured in release notes

🏆 Contribution Levels

Beginner Level

· Documentation improvements
· Bug fixes with "good first issue" label
· UI styling improvements

Intermediate Level

· New components
· API integrations
· Test coverage improvements

Advanced Level

· Architecture changes
· Performance optimizations
· Security implementations
· Feature leadership

📝 License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

🙏 Acknowledgments

· Thanks to all our contributors
· Special recognition for first-time contributors
· Appreciation for bug reporters

---

Happy Contributing! 🚀

अगर आपके कोई questions हैं, तो hesitate न करें - ask away! We're here to help you contribute successfully.

---

This contributing guide is adapted from many successful open-source projects and will evolve with our community.