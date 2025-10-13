# Contributing to Fulexo

**Last Updated:** October 13, 2025

Thank you for your interest in contributing to Fulexo! This document provides guidelines and instructions for contributing to the project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Review Process](#review-process)

---

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards

✅ **Do:**
- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards others

❌ **Don't:**
- Use offensive language
- Make personal attacks
- Harass or discriminate
- Publish others' private information

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

1. ✅ Read the [README.md](./README.md)
2. ✅ Completed [QUICK_START.md](./QUICK_START.md)
3. ✅ Reviewed [DEVELOPMENT.md](./DEVELOPMENT.md)
4. ✅ Set up your development environment
5. ✅ Familiarized yourself with the codebase

### Setting Up Development Environment

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/panel.git
cd panel

# Add upstream remote
git remote add upstream https://github.com/fulexo/panel.git

# Install dependencies
npm install
npm run install:all

# Setup environment
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

# Start development
npm run dev:all
```

---

## 💻 Development Process

### 1. Choose an Issue

- Browse [GitHub Issues](https://github.com/fulexo/panel/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to let others know you're working on it

### 2. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. Make Changes

- Write clean, readable code
- Follow existing code style
- Add/update tests
- Update documentation
- Commit regularly with clear messages

### 4. Test Your Changes

```bash
# Run all quality checks
npm run lint
npm run test

# TypeScript checks
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/worker && npx tsc --noEmit

# Build verification
npm run build:all

# Manual testing
# Test your changes in the browser/API
```

---

## 📝 Coding Standards

### TypeScript

```typescript
// ✅ Good: Explicit types, proper error handling
async function getUser(id: string): Promise<User> {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id } 
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  } catch (error) {
    logger.error('Error fetching user', { error, userId: id });
    throw error;
  }
}

// ❌ Bad: No types, poor error handling
async function getUser(id) {
  return await prisma.user.findUnique({ where: { id } });
}
```

### React Components

```typescript
// ✅ Good: Typed props, proper hooks
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  const handleClick = useCallback(() => {
    onEdit(user.id);
  }, [user.id, onEdit]);

  return (
    <Card onClick={handleClick}>
      <h3>{user.name}</h3>
    </Card>
  );
}

// ❌ Bad: No types, inline handlers
export function UserCard({ user, onEdit }) {
  return (
    <Card onClick={() => onEdit(user.id)}>
      <h3>{user.name}</h3>
    </Card>
  );
}
```

### Naming Conventions

- **Files:** `kebab-case.tsx` or `camelCase.ts`
- **Components:** `PascalCase`
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Interfaces:** `PascalCase` with `I` prefix optional
- **Types:** `PascalCase`

### File Organization

```
feature/
├── feature.module.ts      # NestJS module (API)
├── feature.controller.ts  # Controller
├── feature.service.ts     # Service logic
├── feature.service.spec.ts # Tests
├── dto/
│   ├── create-feature.dto.ts
│   └── update-feature.dto.ts
└── entities/
    └── feature.entity.ts
```

---

## 📤 Submitting Changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <description>

[optional body]

[optional footer]

# Types
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation changes
style:    # Code style changes (formatting)
refactor: # Code refactoring
test:     # Adding or updating tests
chore:    # Maintenance tasks

# Examples
feat(orders): add bulk order processing
fix(auth): resolve token expiration issue
docs: update API documentation
test(products): add unit tests for product service
```

### Pull Request Process

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill out the PR template
   - Link related issues

4. **PR Checklist**
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex logic
   - [ ] Documentation updated
   - [ ] Tests added/updated
   - [ ] All checks passing
   - [ ] No merge conflicts

### Pull Request Template

```markdown
## Description
Brief description of changes and motivation

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
Add screenshots for UI changes
```

---

## 👀 Review Process

### What Reviewers Look For

1. **Code Quality**
   - Follows TypeScript and ESLint rules
   - No console.logs or debug code
   - Proper error handling
   - Clean, readable code

2. **Functionality**
   - Works as described
   - No breaking changes (or documented)
   - Edge cases handled
   - Performance considerations

3. **Tests**
   - Adequate test coverage
   - Tests are meaningful
   - All tests pass

4. **Documentation**
   - Code comments where needed
   - README updated if needed
   - API docs updated if needed

### Timeline

- **Initial Review:** Within 2-3 business days
- **Follow-up Reviews:** Within 1 business day
- **Merge:** After approval from at least 1 reviewer

---

## 🧪 Testing Guidelines

### Writing Tests

```typescript
// Unit test example (Jest)
describe('ProductService', () => {
  let service: ProductService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductService, PrismaService],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a product', async () => {
    const dto = { 
      name: 'Test Product', 
      sku: 'TEST-001',
      price: 99.99 
    };
    
    const result = await service.create('tenant-id', dto);
    
    expect(result).toBeDefined();
    expect(result.name).toBe('Test Product');
  });
});
```

### Test Coverage Requirements

- **Minimum:** 70% overall
- **Target:** 80% overall
- **Critical Paths:** 90%+ (authentication, payments, shipping)

---

## 🎨 UI/UX Guidelines

### Design Principles

1. **Consistency** - Use existing components and patterns
2. **Accessibility** - Follow WCAG 2.1 AA standards
3. **Responsiveness** - Mobile-first design
4. **Performance** - Optimize images and bundle size
5. **User Feedback** - Loading states, error messages, success confirmations

### Component Library

Use existing components from `apps/web/components/`:
- Buttons, Cards, Dialogs
- Forms (FormField, FormSelect, etc.)
- Layouts (PageHeader, EmptyState, etc.)
- Patterns (MetricCard, StatusPill, etc.)

---

## 🔧 Common Contribution Scenarios

### Adding a New API Endpoint

1. Create DTO in `apps/api/src/module/dto/`
2. Add method to service
3. Add controller endpoint with decorators
4. Update Swagger documentation
5. Add tests
6. Update [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Adding a New UI Page

1. Create page in `apps/web/app/your-page/page.tsx`
2. Use existing components and patterns
3. Add to navigation if needed
4. Implement responsive design
5. Add loading and error states
6. Test on mobile and desktop

### Fixing a Bug

1. Create test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Add regression test if needed
5. Document fix in commit message

---

## 🎁 Recognition

Contributors will be:
- Listed in project contributors
- Mentioned in release notes
- Acknowledged in project README (for significant contributions)

---

## 📞 Questions?

- **General Questions:** Create a GitHub Discussion
- **Bug Reports:** Create a GitHub Issue
- **Security Issues:** Email security@fulexo.com (if configured)
- **Feature Requests:** Create a GitHub Issue with `enhancement` label

---

## 📚 Additional Resources

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

---

**Thank you for contributing to Fulexo! 🎉**

Your contributions help make Fulexo better for everyone.
