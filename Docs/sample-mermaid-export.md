# Sample Markdown Export with Dependency Graph

This is a sample generated Markdown export showing the dependency graph visualization.

## Features

| Feature | Priority | Status | Dependencies | Estimated Effort |
|---------|----------|--------|--------------|------------------|
| Database Setup | critical | pending | None | 4 hours |
| API Endpoints | high | pending | Database Setup | 12 hours |
| Frontend UI | high | pending | API Endpoints | 16 hours |
| Authentication | high | pending | Database Setup | 8 hours |
| Security Hardening | medium | pending | Authentication, API Endpoints | 6 hours |

### Feature Dependency Graph

```mermaid
graph TD
    feat_db["Database Setup<br/>(critical)<br/>4h"]:::critical
    feat_api["API Endpoints<br/>(high)<br/>12h"]:::high
    feat_ui["Frontend UI<br/>(high)<br/>16h"]:::high
    feat_auth["Authentication<br/>(high)<br/>8h"]:::high
    feat_security["Security Hardening<br/>(medium)<br/>6h"]:::medium

    feat_db --> feat_api
    feat_api --> feat_ui
    feat_db --> feat_auth
    feat_auth --> feat_security
    feat_api --> feat_security

    classDef critical fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef high fill:#ffd43b,stroke:#f59f00,stroke-width:2px,color:#000
    classDef medium fill:#74c0fc,stroke:#1971c2,stroke-width:2px,color:#000
    classDef low fill:#69db7c,stroke:#2b8a3e,stroke-width:2px,color:#000
```

This shows:
- **Nodes colored by priority**: Red (critical), Yellow (high), Blue (medium), Green (low)
- **Effort in parentheses**: Each node shows estimated hours
- **Dependencies as arrows**: Arrows show which features depend on which
- **Valid Mermaid syntax**: Can be rendered in VS Code Markdown preview or GitHub
