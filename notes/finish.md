# Finish Pulse

## 1. UI polish
- [ ] Commit the 12 uncommitted dashboard files
- [ ] Port the mockup rail/sidebar into the real app
- [ ] Port the mockup overview page (cards, chart, ranked lists)
- [ ] Port the mockup setup page
- [ ] Port the mockup settings page
- [ ] Port the mockup Ask chat
- [ ] Loading skeletons on every card
- [ ] Error states on every card
- [ ] Check every page at phone width
- [ ] Merge `feat/frontend-polish` into `main`

## 2. Demo (no backend)
- [ ] Write a seed script that fakes a month of realistic traffic into local DB
- [ ] Export the API responses for that data to JSON fixtures
- [ ] Add a demo mode that reads fixtures instead of calling the API
- [ ] Hide create/edit/delete buttons in demo mode
- [ ] Ask box in demo: a few pre-recorded questions and answers
- [ ] "Demo data" label on every demo screen
- [ ] Deploy demo to Vercel (demo-pulse.vercel.app or similar)
- [ ] "View demo" link on the landing page

## 3. Load test
- [ ] Install k6
- [ ] Laptop run: find the single-box ceiling and what breaks first
- [ ] Set an AWS billing alarm
- [ ] Spin up the rig from `notes/aws-load-rig.md` (one region, one AZ)
- [ ] Run the load, record p50/p95/p99, errors, throughput, queue depth
- [ ] Check sent events == stored rows
- [ ] Screenshot the graphs
- [ ] Tear everything down the same day
- [ ] Write the results into `notes/load-test.md`

## 4. Wrap up
- [ ] README: demo link, npm link, real load numbers
- [ ] Delete merged branches
- [ ] Add project to akdevv.com
