const { execSync } = require('node:child_process')
const path = require('node:path')

/** Ad-hoc sign unsigned macOS builds so Gatekeeper does not report "app is damaged". */
module.exports = async function afterPack(context) {
  if (process.platform !== 'darwin') return

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = path.join(context.appOutDir, appName)

  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
  } catch (error) {
    console.warn(
      'Ad-hoc codesign skipped:',
      error instanceof Error ? error.message : error
    )
  }
}
