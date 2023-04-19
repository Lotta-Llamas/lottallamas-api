import app from '../server.js'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { test } from '@jest/globals';
import db from '@lotta-llamas/models';

const wallet = {
	address: '19h8nvZWqzpZnEufu611ZG6uZ5jYN1tytn',
	message: 'The man who stole the world',
	signature: 'INtqdSdgpwnvLLDJzQlWPxl5JjreJsoSk1NCIsWr5Q1kJM7N0aOgdfwl0C+e8EzWzbhgs8mUnNeDMPCtnm2YCj0=',
	nickName: 'Jimi'
}

const existingWallet = {
	address: '1FBuCHMw5e5yTNKbf1eJq1bXZjoGaXeqwV',
	message: 'The man who stole the world',
	signature: 'IFAPT9+R/2bli2xFXerJMCcsk+UpiBLrXwCgKQOtrVwnJ97AIv+zmxnr+szfIjNeUSp/uEyTWpozusJhoK5LjF8=',
}

const nonExistingWallet = {
	address: '1FX2EMcKqKQbxPeVSWTdnBwiCp7ijpc9qp',
	message: 'The man who stole the world',
	signature: 'ILcABXX9nvihEeOfKH+J7Ga89rGQr/p2ffaD1YiztD9sC4ofkpY/aE5TLcHOP3SpEn1k+cUMchk+Uy3bkE6iieI=',
}

const { address, message, signature, nickName } = wallet;
const { existingAddress, existingMessage, existingSignature } = existingWallet;

describe('POST - Login (Address, Message, Signature)', () => {
	test('errors if missing param', async () => {
		await request(app)
			.post('/api/validate-wallet')
			.set('Accept', 'application/json')
			.send({ address,  signature })
			.then((response) => {
				expect(response.statusCode).toBe(401);
				expect(JSON.parse(response.text).error).toBe('Missing params');
			})
	});

	test('errors if invalid address', async () => {
		await request(app)
			.post('/api/validate-wallet')
			.set('Accept', 'application/json')
			.send({ address: 'Fake123',  signature, message })
			.then((response) => {
				expect(response.statusCode).toBe(401);
				expect(JSON.parse(response.text).error).toBe('Invalid address');
			})
	});

	test('errors if invalid signature', async () => {
		await request(app)
			.post('/api/validate-wallet')
			.set('Accept', 'application/json')
			.send({ address,  signature: 'Fake123', message })
			.then((response) => {
				expect(response.statusCode).toBe(500);
			})
	});

	test('errors if message is wrong', async () => {
		await request(app)
			.post('/api/validate-wallet')
			.set('Accept', 'application/json')
			.send({ address, signature, message: 'Incorrect Message' })
			.then((response) => {
				expect(response.statusCode).toBe(404);
				expect(JSON.parse(response.text).error).toBe('Invalid Message');
			})
	});

	test('creates wallet record if one doesnt exist', async () => {
		const walletRecord = await db.Wallet.findByPk(nonExistingWallet.address)
		expect(walletRecord).toBe(null);
		await request(app)
			.post('/api/validate-wallet')
			.set('Accept', 'application/json')
			.send({
				address: nonExistingWallet.address,
				signature: nonExistingWallet.signature,
				message: nonExistingWallet.message
			})
			.then(async () => {
				const updatedRecord = await db.Wallet.findByPk(nonExistingWallet.address)
				expect(updatedRecord.id).toBe(nonExistingWallet.address);
				await db.Wallet.destroy({ where: { id: nonExistingWallet.address }})
			})
	});

	test('succeeds if correct params', async () => {
		await request(app)
			.post('/api/validate-wallet')
			.set('Accept', 'application/json')
			.send({ address, signature, message })
			.then((response) => {
				const token = jwt.decode(JSON.parse(response.text).token);
				expect(response.statusCode).toBe(200);			
				expect(token["address"]).toBe(address);
			})
	});
});

// describe('POST - Create account', () => {
// 	afterAll(async() => {
// 		await db.Wallet.destroy({
// 			where: { id: wallet.address }
// 		})
// 	});

// 	test('401 - Account exists', async () => {
// 		const { res } = await request(app)
// 		.post('/api/validate-wallet')
// 		.set('Accept', 'application/json')
// 		.send({ existingAddress, existingMessage, existingSignature })
// 		.then((record) => {
// 			return record;
// 		})

// 		const token = JSON.parse(res.text).token;

// 		await request(app)
// 			.post('/api/create-account')
// 			.set('Accept', 'application/json')
// 			.set({'Authorization': token, 'Address': address })
// 			.send({ nickName })
// 			.then((response) => {
// 				expect(response.statusCode).toBe(401);
// 				expect(JSON.parse(response.text).error).toBe('Account exists');
// 			})
// 	})

// 	test('succeeds if proper token is present', async () => {
// 		const { res } = await request(app)
// 			.post('/api/validate-wallet')
// 			.set('Accept', 'application/json')
// 			.send({ address, message, signature })
// 			.then((record) => {
// 				return record;
// 			})

// 		const token = JSON.parse(res.text).token;

// 		await request(app)
// 			.post('/api/create-account')
// 			.set('Accept', 'application/json')
// 			.set({'Authorization': token, 'Address': address })
// 			.send({ nickName })
// 			.then((response) => {
// 				expect(response.body.account.id).toBe(wallet.address);
// 				expect(response.body.account.nickName).toBe(wallet.nickName);
// 				expect(response.statusCode).toBe(200);
// 			})
// 	});
// })
