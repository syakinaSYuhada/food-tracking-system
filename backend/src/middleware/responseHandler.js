function successResponse(res, data = null, message = 'Success', statusCode = 200) {
	return res.status(statusCode).json({
		success: true,
		message,
		data
	})
}

function errorResponse(res, error, statusCode = 400, code = 'ERROR') {
	const message = typeof error === 'string' ? error : error.message

	return res.status(statusCode).json({
		success: false,
		message,
		code,
		data: null
	})
}

module.exports = {
	successResponse,
	errorResponse
}

