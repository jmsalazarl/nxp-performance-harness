# Product Steering

## Product

This workspace contains a K6-based API performance testing setup. The product direction is to add a local web app that helps testers generate valid K6 config files and inspect performance summary output.

## Users

- QA engineers.
- Performance testers.
- Developers who need quick load, stress, capacity, or stability checks.

## Goals

- Reduce manual editing of `config.js`.
- Keep generated configs compatible with the existing K6 runner.
- Make performance output easier to understand through dashboards.
- Keep the first version local and simple.

## Non-Goals

- No hosted service in the first version.
- No database in the first version.
- No external upload of performance data.
- No replacement of K6 execution logic beyond minimal reporting support.
