## [0.1.3](https://github.com/LiteracyBridge/amplio-backend/compare/v0.1.2...v0.1.3) (2024-08-29)



## [0.1.2](https://github.com/LiteracyBridge/amplio-backend/compare/v0.1.1...v0.1.2) (2024-08-29)



## [0.1.1](https://github.com/LiteracyBridge/amplio-backend/compare/v0.1.0...v0.1.1) (2024-05-23)


### Bug Fixes

* bug fix ([7101891](https://github.com/LiteracyBridge/amplio-backend/commit/7101891eb4d036d08c8ef2538331d251c5854967))
* **config:** remove unused imports ([a4e88f8](https://github.com/LiteracyBridge/amplio-backend/commit/a4e88f85ef7ca07731733585048a71571b71ae9d))
* **program-spec:** skip message language saving if language code is empty ([7799349](https://github.com/LiteracyBridge/amplio-backend/commit/77993491d3ae2cab4639987ad7b06ae5b4b8ed2f))



# [0.1.0](https://github.com/LiteracyBridge/amplio-backend/compare/e83aea650c67b82f930395adea2bad10efb740ca...v0.1.0) (2024-05-23)


### Bug Fixes

* patch program spec DbReady to support sqlalchemy ([d33175e](https://github.com/LiteracyBridge/amplio-backend/commit/d33175e8d16d3a3aff79daf9c13a04e1b31f0076))
* **program-spec:** disable add new languages to `supportedlanguages` table ([1356ad5](https://github.com/LiteracyBridge/amplio-backend/commit/1356ad5b29d4ba371f841ffb5beecd1a3fef8d68))
* **program-spec:** program spec update ([04c7e48](https://github.com/LiteracyBridge/amplio-backend/commit/04c7e48286fc69f66a93cb92d87bf713db9ea8b6))
* **program-spec:** syntax errors ([1a0df08](https://github.com/LiteracyBridge/amplio-backend/commit/1a0df08c32a86d5288ac8361567d5a365c35a44e))
* replace `Claim` import with `current_user` helper ([6d0d7e5](https://github.com/LiteracyBridge/amplio-backend/commit/6d0d7e5923dd774406f400c2c428d25988e7157d))
* **role:** remove fetching all programs of the user's org (email domain) ([3c00ef9](https://github.com/LiteracyBridge/amplio-backend/commit/3c00ef9eec780e415d6a80717de43c0ad98fec96))
* **spec:** new language name not saved in languages table ([92b23fd](https://github.com/LiteracyBridge/amplio-backend/commit/92b23fde28fb397ca36d90bf1bcfe2ab494b0bfa))
* **spec:** update program spec publishing ([fb2ea0a](https://github.com/LiteracyBridge/amplio-backend/commit/fb2ea0afc94f49cdd2edbb4ddbdc70517427df21))
* update CORS config ([268a0a6](https://github.com/LiteracyBridge/amplio-backend/commit/268a0a6dfd5e44dbb64d2ac77027705d094159ff))
* update sentry config ([d35f9e1](https://github.com/LiteracyBridge/amplio-backend/commit/d35f9e1bd75eb6347b23dfbd89d811c4cc0d8f4d))


### Features

* add `current_user` helper function ([f125307](https://github.com/LiteracyBridge/amplio-backend/commit/f12530722b37cd1b0668c4ec4d90c876f74905ef))
* add categories route ([ca8c5aa](https://github.com/LiteracyBridge/amplio-backend/commit/ca8c5aaa7ff6d7d9c8604e373830a397f2c179d7))
* add program languages to spec publishing to s3 ([7f1751f](https://github.com/LiteracyBridge/amplio-backend/commit/7f1751f04fd62855a9650073779fad2d2d76a325))
* add program spec handler ([7030472](https://github.com/LiteracyBridge/amplio-backend/commit/703047284b93e3a6702b9d6923781527794574de))
* add programs route ([0aafec5](https://github.com/LiteracyBridge/amplio-backend/commit/0aafec5f075cc94b6136a4ce9d6864f84f1419a6))
* add spec publishing endpoint ([6bc3e2b](https://github.com/LiteracyBridge/amplio-backend/commit/6bc3e2b0d8fe87bbc4da582451c7dabd88acd80a))
* initial commit ([e83aea6](https://github.com/LiteracyBridge/amplio-backend/commit/e83aea650c67b82f930395adea2bad10efb740ca))
* **program-spec:** implement program languages diff ([7505098](https://github.com/LiteracyBridge/amplio-backend/commit/750509858c5a3e10076d9bba8f3e2abb0fcf52e5))
* **program-spec:** implement syncing new languages with supportedlanguages list ([93de476](https://github.com/LiteracyBridge/amplio-backend/commit/93de4761f7db74efcdeb7e1179f7babc56d25fe6))


### Reverts

* Revert "ci: add pyright check to github-ci" ([50224d8](https://github.com/LiteracyBridge/amplio-backend/commit/50224d85c2698a6302587d39607359e3a7af0be4))



