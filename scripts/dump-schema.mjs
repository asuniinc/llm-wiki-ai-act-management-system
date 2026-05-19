#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const common = readFileSync(join(root, "schema/common.md"), "utf-8")
const framework = readFileSync(join(root, "schema/framework.md"), "utf-8")

const merged = `${common}\n\n---\n\n${framework}`
writeFileSync(join(root, "schema.md"), merged)
console.log("schema.md generated from schema/common.md + schema/framework.md")
