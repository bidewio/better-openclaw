# Vision

## Mission

Better OpenClaw exists to make self-hosted AI infrastructure accessible to everyone. We believe that deploying production-ready AI agent stacks should be as simple as running a single command.

## Core Principles

### 1. Developer Experience First

- **Zero to production in minutes**: Users should be able to go from nothing to a running OpenClaw stack with minimal friction
- **Interactive and guided**: The CLI should guide users through decisions with helpful context
- **Visual when helpful**: The web UI provides a visual stack builder for those who prefer it
- **Composable by default**: Services should work well together with minimal configuration

### 2. Production-Ready Defaults

- **Security by default**: Auto-generated secrets, secure defaults, TLS-ready reverse proxy
- **Battle-tested configurations**: Service definitions based on real-world production deployments
- **Scalability considered**: Architecture that can grow from development to production
- **Monitoring included**: Observability stack (Grafana, Prometheus, Loki) built-in

### 3. Community-Driven

- **Open and transparent**: AGPL-3.0 license, open governance
- **AI-friendly contributions**: We welcome AI-assisted PRs with proper attribution
- **Comprehensive documentation**: Every service documented, every decision explained
- **Skill-first thinking**: OpenClaw skills are first-class citizens

### 4. Platform Flexibility

- **Docker Compose**: The primary deployment target for simplicity
- **Native support**: Bare-metal recipes for performance-critical services
- **Cloud-agnostic**: Works on any VPS, homelab, or cloud provider
- **Future-ready**: Architecture that can support Kubernetes, Nomad, etc.

## What We're Building

### Short Term (Q1-Q2 2026)

- ✅ Core service definitions (201 services across 37 categories)
- ✅ Interactive CLI wizard
- ✅ REST API for programmatic generation
- ✅ Visual stack builder (web UI)
- 🚧 Mission Control (monitoring & management)
- 🚧 MCP server for AI agent integration
- 📋 Skill pack ecosystem
- 📋 Template marketplace

### Medium Term (Q3-Q4 2026)

- 📋 Native installation recipes for all major services
- 📋 Multi-environment support (dev/staging/prod)
- 📋 Stack migration tools
- 📋 Health check dashboard
- 📋 Automated updates & backups
- 📋 Cost estimation & optimization

### Long Term (2027+)

- 📋 Kubernetes manifests generation
- 📋 Terraform/OpenTofu providers
- 📋 Multi-node orchestration
- 📋 Advanced networking (service mesh, etc.)
- 📋 Compliance & audit tooling
- 📋 Marketplace for commercial services

## Design Philosophy

### Composition Over Monoliths

Better OpenClaw is designed as a collection of focused packages:

- `@better-openclaw/core`: Pure TypeScript schemas and generation logic
- `create-better-openclaw`: Interactive CLI for end users
- `@better-openclaw/api`: REST API for tooling integration
- `@better-openclaw/web`: Visual stack builder
- `@better-openclaw/mission-control`: Management & monitoring UI

Each package has a single, clear purpose. This makes the codebase maintainable and allows users to pick what they need.

### Validation at Every Layer

We validate:
1. Service definitions at build time (TypeScript + Zod)
2. User selections in the CLI (dependency resolution)
3. Generated configurations before writing (schema validation)
4. Docker Compose files after generation (YAML validity)

This prevents broken stacks from ever being generated.

### Progressive Disclosure

- **Simple by default**: The CLI asks only essential questions
- **Advanced when needed**: Power users can access all options via flags or config files
- **Discoverable**: Features are easy to find when you need them

### Testing Over Documentation

While we write good docs, we prefer:
- Snapshot tests that ensure stable output
- Integration tests that validate real-world scenarios
- Type safety that prevents entire classes of bugs

Code that doesn't need documentation is better than well-documented code.

## Non-Goals

To stay focused, we explicitly exclude:

- **Building Docker images**: We reference existing images from Docker Hub, GitHub Container Registry, etc.
- **Service development**: We don't maintain the services themselves (Redis, PostgreSQL, etc.)
- **Hosting**: We provide the tooling, users provide the infrastructure
- **GUI for everything**: Some things are better done with code/config files
- **Enterprise features behind paywall**: Everything stays open source

## Community & Governance

### Contribution Philosophy

We welcome contributions from everyone, including AI-assisted development. Our standards:

- Quality over quantity
- Tests required for new features
- Security consciousness
- Clear communication

### Decision Making

- **Technical decisions**: Maintainers have final say, but community input is valued
- **Service additions**: Community can propose via PRs with proper testing
- **Architecture changes**: Discussed in GitHub Discussions first

### Sustainability

Better OpenClaw is:
- Funded by community donations and sponsorships
- Maintained by volunteers passionate about self-hosted AI
- Committed to staying open source (AGPL-3.0)

## Success Metrics

We measure success by:

1. **Adoption**: Number of stacks generated and deployed
2. **Contribution**: PR count, issue engagement, skill submissions
3. **Stability**: Low bug report rate, high uptime for generated stacks
4. **Satisfaction**: User feedback, GitHub stars, community growth

Quality always beats quantity. We'd rather have 1,000 happy users than 100,000 frustrated ones.

---

**This is a living document.** As the project evolves, so will this vision. Last updated: August 2026.
