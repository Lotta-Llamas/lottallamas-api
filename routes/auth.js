import express from 'express';
const router = express.Router()
import jwt from 'jsonwebtoken'
import auth from '../middleware/auth.js'
import verifyWalletBodyParams from '../middleware/body.js'
import pkg from 'bitcore-lib';
const { Message } = pkg;
import https from 'https';

import db from '@lotta-llamas/models'

/**
 * Get all tokens within wallet
 * 
 * @param {string} address Wallet address
 * @returns {object} Returns the res.status, indicating an error or calls next() if passes 
 */

async function getWalletBalance(address) {
	return new Promise((resolve, reject) => {
		try {
			let data = ''
			https.get(`https://xchain.io/api/balances/${address}`, (res) => {
				res.on('data', chunk => { data += chunk }) 
				res.on('end', () => {
					resolve(data);
				})
			})
		} catch(error) {
			reject(error)
		}
	})
}

/**
 * POST /api/auth/validate-wallet
 * @summary a wallet address, signature, and message which is used in validating
 * wallet possesion.  After validation a JWT is created. This contains the wallets
 * assets and the wallet address
 * @param {object} req The Express request object
 * @param {object} res The Express response object
 * @return {object} - 200 JWT containing
 * @throws {object} - 404 Invalid Message
 * @throws {object} - 500 Server Error
 */

router.post('/validate-wallet', verifyWalletBodyParams, async (req, res, next) => {
	try {
		const { address, signature, message } = req.body;
		
		// add wallet address to DB if it does not already exist
		const [ wallet, created ] = await db.Wallet.findOrCreate({
			where: { id: address }
		});

		const verified = new Message(message).verify(address, signature);

		if (verified) {
			const wallet = await getWalletBalance(address)
			const assets = JSON.parse(wallet).data
				.map((token) => token.asset_longname)
				.filter((token) => token ? token : false)

				// TODO: Make a real key, dingus.
			const token = jwt.sign({ address, assets }, 'shh');

			req.logger.log({ level: 'info', message: `Address: ${address} ${created ? 'created' : 'validated'}` });

			res.status(200).send({ token, address })
		} else {
			res.status(404).send({ error: 'Invalid Message' })
		}
	} catch(error) {
		next(new Error(error))
	}
});

/**
 * POST /api/auth/create-account
 * @summary WIP Account creation endpoint.
 * @param {object} req The Express request object
 * @param {object} res The Express response object
 * @return {object} - 200 Record of created wallet
 * @throws {object} - 500 Server Error
 */

// TODO: Build out the create endpoint
router.post('/create-account', auth, async (req, res, next) => {
	try {
		const account = await db.Wallet.create({
			id: req.address,
			nickName: req.body.nickName
		})

		res.status(200).send({ account })
	} catch (error) {
		next(new Error(error))
	}
})

export default router;