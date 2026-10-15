import { defineRailway, project, service } from 'railway/iac';
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = 'campushr';
export default defineRailway(() => {
  const campushr = service('campushr', {
    // builder from CaC: "RAILPACK"
    build: 'npm run build',
    start: 'npm start',
    healthcheck: '/api/v1/health',
    replicas: { ams: 1 },
  });

  return project('acceptable-presence', {
    variables: { managed: false },
    resources: [campushr],
  });
});
