## [0.0.2](https://github.com/LiteracyBridge/amplio-backend/compare/v0.2.2...v0.0.2) (2024-10-25)



## [0.2.2](https://github.com/LiteracyBridge/amplio-backend/compare/v0.2.1...v0.2.2) (2024-09-11)


### Bug Fixes

* program spec error ([e1e6f39](https://github.com/LiteracyBridge/amplio-backend/commit/e1e6f39229045946b08fc3ed62e799cc6d99d990))
* tableau jwt generation error ([74aade3](https://github.com/LiteracyBridge/amplio-backend/commit/74aade305a5d8045b54044fbf34bee78ba4abec5))



## [0.2.1](https://github.com/LiteracyBridge/amplio-backend/compare/v0.2.0...v0.2.1) (2024-09-09)


### Bug Fixes

* **spec:** return program spec data after upload ([0ef6d07](https://github.com/LiteracyBridge/amplio-backend/commit/0ef6d07ed4de4060675e77ae5eafaccec91526ba))



# [0.2.0](https://github.com/LiteracyBridge/amplio-backend/compare/v0.1.5...v0.2.0) (2024-09-04)


### Bug Fixes

* **auth:** throw unathorized error if jwt verification fails ([e05abe6](https://github.com/LiteracyBridge/amplio-backend/commit/e05abe691b881345791b95df1908d583cd01ab8e))
* broken tableau jwt generation ([a190e04](https://github.com/LiteracyBridge/amplio-backend/commit/a190e04870d47c71347b2e0c8860eadbbfd24dba))
* category & language model update ([dab255a](https://github.com/LiteracyBridge/amplio-backend/commit/dab255ac5340dcb8a1294a0b17e3d38140969ba8))
* config reading bug ([84752fd](https://github.com/LiteracyBridge/amplio-backend/commit/84752fd0f1d05ff6cafe32f53f674616b8bbe856))
* data migration bug ([11f12d6](https://github.com/LiteracyBridge/amplio-backend/commit/11f12d6b52446643adbd675aa23fb245ca2b5ad6))
* **db:** remove `other_name` columns from invitations and users tables ([d97530a](https://github.com/LiteracyBridge/amplio-backend/commit/d97530ad3f4f172c08a53fdfb816a3929b2c2e79))
* dynamodb causing server to crash when run locally ([aabda5b](https://github.com/LiteracyBridge/amplio-backend/commit/aabda5be74c2b3d31617d90fc76a2ded8495be6d))
* migration bug ([0686fd4](https://github.com/LiteracyBridge/amplio-backend/commit/0686fd4529be2bfa53dc0e1647b675cbd9b7c7f2))
* **migration:** alembic prod migration errors ([f9f8928](https://github.com/LiteracyBridge/amplio-backend/commit/f9f89286a363d7c8531568f5f7b9ba7f14162e34))
* mypy type errors ([c6e66dc](https://github.com/LiteracyBridge/amplio-backend/commit/c6e66dcc5c19163f817e3d4496a1c98b32f960bc))
* **program-spec:** recipient update conflict error ([72d4133](https://github.com/LiteracyBridge/amplio-backend/commit/72d4133f49dc95d2a5b496bc7665a7ff9c279723))
* **programs:** rewrite all programs query to use the current user's org ([9c70ba6](https://github.com/LiteracyBridge/amplio-backend/commit/9c70ba6f22ecafbf2b3666b18cb27d5d4a2d0af7))
* **program:** update routes to use current_user helper ([6ec49e1](https://github.com/LiteracyBridge/amplio-backend/commit/6ec49e1956290c5e026608cd064bb5d63cb098a9))
* pyright type errors ([01c2294](https://github.com/LiteracyBridge/amplio-backend/commit/01c2294bef4818d40505c0a4aef06262be6436e0))
* **roles:** psql "updated_at" violates not-null constraint error when creating role ([3c9a30f](https://github.com/LiteracyBridge/amplio-backend/commit/3c9a30f70850128590fcc119307168c42b08109c))
* **script: new-acm:** remove project list population to s3 bucket. Postgresql is now the source of truth ([f3b76d3](https://github.com/LiteracyBridge/amplio-backend/commit/f3b76d377829abcb50b10579bdf8c2de1b43e9ed))
* **script: new-acm:** sql query bugs ([1ed9296](https://github.com/LiteracyBridge/amplio-backend/commit/1ed9296653638fbc4241ff69ea509873a3f0ad7e))
* **script: tableau:** commit query transaction ([bc0e0c7](https://github.com/LiteracyBridge/amplio-backend/commit/bc0e0c720920932fdf70ce1c6b58d0a6d7860a57))
* **script:** add brief documentation ([713ce69](https://github.com/LiteracyBridge/amplio-backend/commit/713ce69eaa9317111b163be9e3cbbb7205ea3068))
* **script:** remove filter check to skip recipients with latitude & longitude set in tableau geo importer ([75f8253](https://github.com/LiteracyBridge/amplio-backend/commit/75f8253b87605da9dac626b3f14887b3e99ab12f))
* **spec:** add program spec download endpoint ([430a17c](https://github.com/LiteracyBridge/amplio-backend/commit/430a17c867559acebc2dbc58cacee88de9989101))
* **spec:** content update bugs ([af30ef4](https://github.com/LiteracyBridge/amplio-backend/commit/af30ef4f3a00fdc60344c9094c9fd29d4a721b42))
* **tbloader:** change type of `n` query string to int ([64ebc23](https://github.com/LiteracyBridge/amplio-backend/commit/64ebc239191f1191c0f6b66b6e5c651a6bfce505))
* type errors ([77b6e02](https://github.com/LiteracyBridge/amplio-backend/commit/77b6e02481e1660208703e94a0582edf1aa30fd7))
* **uf: message:** add endpoint for marking message as useless ([a7bb549](https://github.com/LiteracyBridge/amplio-backend/commit/a7bb549fa71b247d5639b20aa97b012f001a3ed8))
* **uf: messages:** reduce message browser sample size ([5d7de2c](https://github.com/LiteracyBridge/amplio-backend/commit/5d7de2c01fa93abbfd407edb18f1da82c6fab595))
* **uf: messages:** remove query by message id ([987c738](https://github.com/LiteracyBridge/amplio-backend/commit/987c738e9ad041dcb01fad1239bdc1f5b86aa3b5))
* **uf: report:** rewrite data structure ([df7e0b6](https://github.com/LiteracyBridge/amplio-backend/commit/df7e0b695dd3f6c15fe9016178ba2c27cbf0dd44))
* **uf:** update stats ([e7bbc2a](https://github.com/LiteracyBridge/amplio-backend/commit/e7bbc2a698e944a750ca7dd7965a4e087d7cc3c7))
* update config ([02c004d](https://github.com/LiteracyBridge/amplio-backend/commit/02c004d1232296822a05fcdf4aa01a4e8912bf83))
* update data migration script ([a6e385a](https://github.com/LiteracyBridge/amplio-backend/commit/a6e385a0a020e91f167468633b7c6bcd82fb8d49))
* update email template ([6de746a](https://github.com/LiteracyBridge/amplio-backend/commit/6de746abe9a4695316898e539dfcaa77c7cba564))
* update email template ([8213507](https://github.com/LiteracyBridge/amplio-backend/commit/82135075c4847d8daa3379e3a7edcf4a9b82f7a6))
* update mail template ([92e648a](https://github.com/LiteracyBridge/amplio-backend/commit/92e648af9dba60c5d5e10dbf05d47bfe78c420fc))
* update roles template ([56e8508](https://github.com/LiteracyBridge/amplio-backend/commit/56e850802930642225958e4dd125d04d549d135e))
* update user_pool_client_id to allow multiple values ([c406966](https://github.com/LiteracyBridge/amplio-backend/commit/c4069667177c5762ebbc29204a871e13e51a42f5))
* **user: roles:** add get & delete invitations endpoints ([663221a](https://github.com/LiteracyBridge/amplio-backend/commit/663221a2a1a2dc63f2adfce7133013fc09cb9a72))
* **user: roles:** sqlachemy query syntax bugs ([c846247](https://github.com/LiteracyBridge/amplio-backend/commit/c8462476c6caa0139919067e71b0cede88b82829))
* **users: invitation:** 401 error when accepting invitation due to permission check ([a53214b](https://github.com/LiteracyBridge/amplio-backend/commit/a53214b91664559c115b2faa6598d1e89c8f5f09))
* **users: role:** encoding roles query results to json error ([1af1b27](https://github.com/LiteracyBridge/amplio-backend/commit/1af1b273efc648503327cd86c93f117609ef39ae))


### Features

* add code stubs for oranisation & role models ([cb19596](https://github.com/LiteracyBridge/amplio-backend/commit/cb19596a8a08ce18eadf654167f2a9308b0daba5))
* add dashboard queries route ([a1a357c](https://github.com/LiteracyBridge/amplio-backend/commit/a1a357c96dde1c6cf6642a4f5c09a98d3b06467c))
* add dynamo users to postgres migration ([4941e07](https://github.com/LiteracyBridge/amplio-backend/commit/4941e07256d57e7ba3e48b618b928fc59988e1ca))
* add endpoint for inviting user ([69500f3](https://github.com/LiteracyBridge/amplio-backend/commit/69500f37da53f05db60e9f719cfa9aac24e92750))
* add migration for creating default roles for all orgs ([d833253](https://github.com/LiteracyBridge/amplio-backend/commit/d8332536ad03d7a85b29a8187ba0c610e4ef41fd))
* add migrations for organisations and invitations tables ([7c156c3](https://github.com/LiteracyBridge/amplio-backend/commit/7c156c3633ed5f0783dd5751f7202b8d06ebde07))
* add permission check to route definitions ([8d588a3](https://github.com/LiteracyBridge/amplio-backend/commit/8d588a30f1ba0c5f75231e1f12441d1fb29b408e))
* add permission check to routes ([a73659f](https://github.com/LiteracyBridge/amplio-backend/commit/a73659f5c4e3692589c98f7191f016bf2a765e3a))
* add program organisation users route ([c425e10](https://github.com/LiteracyBridge/amplio-backend/commit/c425e103b9c3ba9b8cde910830dd79a493305b5d))
* add sample role checker decorator ([86d586c](https://github.com/LiteracyBridge/amplio-backend/commit/86d586c1705b9e2e73155f5b6c21e860a58967f4))
* add tableau route ([4b5ed1b](https://github.com/LiteracyBridge/amplio-backend/commit/4b5ed1b83469be0107458f71faa1fd488124e97d))
* add talking book serial number reservation endpoint ([e2f161a](https://github.com/LiteracyBridge/amplio-backend/commit/e2f161a567db74bbfe8df621a8e077e34269b5a9))
* add tb_deployed model ([127343e](https://github.com/LiteracyBridge/amplio-backend/commit/127343e2fdd590183415560aa7c3cb7b2d845dc0))
* add user programs migration from dynamo ([4ae17d0](https://github.com/LiteracyBridge/amplio-backend/commit/4ae17d02f86bbc4e8075712b280c5aee21aa3f5c))
* add userfeedback models ([e97bffe](https://github.com/LiteracyBridge/amplio-backend/commit/e97bffef96e00e69de1dae0454d5dc49a0979369))
* add userfeedback routes ([0960c2b](https://github.com/LiteracyBridge/amplio-backend/commit/0960c2b4bc52deede66f968e1943aee341b17409))
* add userfeedback routes ([791d07f](https://github.com/LiteracyBridge/amplio-backend/commit/791d07f535090e016813664165efa98de15fb9ac))
* **db:** add `parent_id` to organisations table ([d0418d2](https://github.com/LiteracyBridge/amplio-backend/commit/d0418d2cb611a83384ea7805f1a673d0ba4780ee))
* implement adding multiple orgs to a program ([be58713](https://github.com/LiteracyBridge/amplio-backend/commit/be587134f4f036ae02683c55ca27a6ad68529a15))
* implement api for creating new role ([1d7bb3d](https://github.com/LiteracyBridge/amplio-backend/commit/1d7bb3ddc3ca854420a92ca27e1aecdf177b7033))
* implement caching current user object in memory ([d1a79f2](https://github.com/LiteracyBridge/amplio-backend/commit/d1a79f24d207bcf9a55fc5a1ee5731a411a4436e))
* implement route level permission check ([5049e66](https://github.com/LiteracyBridge/amplio-backend/commit/5049e6610138dc862789205ee2f8d12fe5ffa21b))
* **program-spec:** rewrite get content endpoint ([4e2c2df](https://github.com/LiteracyBridge/amplio-backend/commit/4e2c2df2485a156b329aa70d0953b8f21a03e149))
* **programs:** implement adding new users to a program ([d86f84c](https://github.com/LiteracyBridge/amplio-backend/commit/d86f84c299b4f46c6b1d5becb33c4a2937efe9c4))
* **programs:** rewrite programspec content endpoint ([7d2657e](https://github.com/LiteracyBridge/amplio-backend/commit/7d2657ed09e37adbdcdbf2e4fba4e391a2b7399e))
* **queries:** filter recipients by deployment number ([98ac119](https://github.com/LiteracyBridge/amplio-backend/commit/98ac11961d99a703c1590ed9fdf9e84b1743c741))
* **role:** add statistics to roles template ([7cc93d7](https://github.com/LiteracyBridge/amplio-backend/commit/7cc93d7922f116ad0c1c44c191243cded82871b4))
* **route: programs:** add `get_all_programs` endpoint to get system-wide programs based on the current user's permissions ([3f93b3c](https://github.com/LiteracyBridge/amplio-backend/commit/3f93b3cd8a14725f52223a245af9ffdeddee7aa1))
* **script:** add a script for moving collected stats data by the android tb loader from amplio-program-content to acm-stats bucket ([#2](https://github.com/LiteracyBridge/amplio-backend/issues/2)) ([0b12f7a](https://github.com/LiteracyBridge/amplio-backend/commit/0b12f7a220f2c5f17a71d801b758a42140422edf))
* **script:** add a script to import tableau location data ([52b0983](https://github.com/LiteracyBridge/amplio-backend/commit/52b09833f3f22dde171699bb5fd85b09e5ef7e19))
* **script:** add email notification to android collected data migration script ([3aef8f9](https://github.com/LiteracyBridge/amplio-backend/commit/3aef8f9fe54a72b4cdc700426d15b2a765864fc9))
* **scripts:** add csv insert script ([1c4b5a8](https://github.com/LiteracyBridge/amplio-backend/commit/1c4b5a826912b024b292b1c3f3fad056db76cb08))
* **scripts:** add csv insert script ([b970af2](https://github.com/LiteracyBridge/amplio-backend/commit/b970af20f5ef53107db45488aea8cf0f677630e1))
* **scripts:** add new-acm script (from utilities) with support for only S3 - Dropbox is no longer in use! ([d40dbae](https://github.com/LiteracyBridge/amplio-backend/commit/d40dbae3d5038dee3bfe9b42680119f4b724ff46))
* **scripts:** add usage info updater script ([5f40524](https://github.com/LiteracyBridge/amplio-backend/commit/5f40524ae00ea569e514c1a36dcb14b5aa540f8b))
* **settings: programs:** add endpoint for fetching& deleting program users ([1e45d5b](https://github.com/LiteracyBridge/amplio-backend/commit/1e45d5b0eef593fd70d23d594d5d1d8745cf6771))
* **uf: analysis:** add submissions endpoint ([1febe5a](https://github.com/LiteracyBridge/amplio-backend/commit/1febe5a6a40f52611dd69ea7c98223d2ef7d9356))
* **uf: messages:** add endpoint for transcribing message ([b60f074](https://github.com/LiteracyBridge/amplio-backend/commit/b60f074d0aa7e4d9132f4c083e1b9b4766861cc1))
* **uf: report:** return json response, excel export is handled on the frontend ([08e9bd5](https://github.com/LiteracyBridge/amplio-backend/commit/08e9bd5055030beccc90a8f8746cd0af380e7eac))
* **uf:** add endpoint to fetch sample uf messages ([5700bdf](https://github.com/LiteracyBridge/amplio-backend/commit/5700bdf4cf3ac83467d6f10ce19164751eb7b2da))
* **user: role:** implement assigning role to user ([610d664](https://github.com/LiteracyBridge/amplio-backend/commit/610d664e987bd6f1dccec4bb12a058a54978a94e))
* **user: role:** implement revoking role from a user ([1fc9f61](https://github.com/LiteracyBridge/amplio-backend/commit/1fc9f6124acf787e6f3d01061f9845c25bebbdad))
* **user: role:** implement role deletion ([bb012a8](https://github.com/LiteracyBridge/amplio-backend/commit/bb012a8b22fb8e9ca69e18440ad4095d3a95927d))
* **user: roles:** add get roles endpoint ([7e74462](https://github.com/LiteracyBridge/amplio-backend/commit/7e744620a5fae6533b8275e0895e062b13c2d92e))
* **user: roles:** add program to assign role endpoint & program_users table ([de1ab71](https://github.com/LiteracyBridge/amplio-backend/commit/de1ab7122db79772b549d5a85bdabc13ed124786))
* **user: roles:** update assign role endpoint to update/revoke existing roles ([d9ef11e](https://github.com/LiteracyBridge/amplio-backend/commit/d9ef11ecfab7981228a677e7f10a4367c8c36ea9))
* **user:** add get users endpoint ([9e132de](https://github.com/LiteracyBridge/amplio-backend/commit/9e132dec35fef10015b15980d4557618d302947f))
* **user:** include `deployments` in program response ([6772533](https://github.com/LiteracyBridge/amplio-backend/commit/6772533df94e762f39c29938df2df41110af811d))
* **users: invitation:** implement creating of user a/c when invitation is accepted ([7f2fa1a](https://github.com/LiteracyBridge/amplio-backend/commit/7f2fa1ab694d3db061bebe50f9d38ec41aa8c069))
* **users:** add organisations endpoint ([aaee127](https://github.com/LiteracyBridge/amplio-backend/commit/aaee127868903c5e33ab1bff775a0c4ec1c55b4a))
* **users:** include program->project in use programs response ([e29fc61](https://github.com/LiteracyBridge/amplio-backend/commit/e29fc61f6f6c2f981e4251ab3cf3d77f33ca7baa))



## [0.1.5](https://github.com/LiteracyBridge/amplio-backend/compare/v0.1.4...v0.1.5) (2024-09-03)



