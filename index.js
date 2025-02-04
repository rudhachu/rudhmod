const client = require('./lib/client')
const initialize = async () => {
	try {
		await client.connect()
	} catch (error) {
		console.error(error)
	}
}

initialize()
