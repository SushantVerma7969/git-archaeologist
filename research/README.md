# Raw Research Data

Per-repository JSON outputs from git-archaeologist v1.9.2, collected June 9, 2026.

Each file contains the full analysis output including cursed files array, bus factor breakdown, and file statistics.

## Repository commit SHAs at time of analysis

- **angular**: `47d68dcb26266316647133ab6385e77fc3e5ae08`
- **deno**: `2b313e2bddf6610ea29fbcd20c0dd3d8535c45ff`
- **django**: `7f2afdd0f6a872ccb48d7fbdaacce9b11216af52`
- **docker-compose**: `77ec74ee6718f5e5c77c3ce7bd4ab89cb57d57e5`
- **elasticsearch**: `5691d3d7fdf2ba7151c9ae3dc5d2e5ea61d6e384`
- **express**: `dae209ae6559c29cfca2a1f4414c51d89ea643d5`
- **golang**: `e95518b5404abb9241836f2e95338151766bb79e`
- **kafka**: `5111ad253a7ac12061c73ce4ab62a19ca7dc3d4e`
- **kubernetes**: `dbc6f8a3fe89541291eae2e88c0653300a8b5191`
- **laravel**: `baef9af1b6426bfe114b5dfdc40a4cefd5f62e2d`
- **nestjs**: `69ee5cb1a57b7dd3be49eb8c408d0e42df89c796`
- **nextjs**: `7041635b106c28ed71cfe0858c2cb46c26820963`
- **nginx**: `cab0697310b5d5ec80e84cb215f0547403605052`
- **nodejs**: `1b4e0fd599975619e23ae80b864187403eef82e3`
- **rails**: `ddf8c2f393e43178a0f523413c3ad681d264ee0d`
- **react**: `900ae094d85b11c67d53dd14af50a2bda5db4495`
- **redis**: `23b90e906fbf4ee6207d94e97e224b8c31a90e03`
- **remix**: `6616ed2bc872679a271f13f9c6e37462e923c453`
- **spring-boot**: `0dbfb17a7de675e0b4377bdc63668a2dde648dc9`
- **svelte**: `a9f48540e236d326714a1148b9d61cf785c0f98a`
- **tensorflow**: `bb81f08af80dcfab8e5eca338dfeaa6229b6acdd`
- **vite**: `689a0669ad926461f3f1b81701cb6c01f7b2bd4a`
- **vscode**: `ddba262fb781af40477e24d5fed51f421f909a99`
- **vue2**: `9e88707940088cb1f4cd7dd210c9168a50dc347c`
- **vue3**: `478e3e83acd34dd213a860be4a2a2bf2090dc26b`

## Notes
- **elasticsearch**, **kubernetes**, and **vscode** were analyzed but their JSON outputs exceed GitHub's 100MB file size limit and are not hosted here. The analysis data is available on request.

## Reproduce

```bash
npm install -g git-archaeologist
git-arch analyze /path/to/repo --json
```
