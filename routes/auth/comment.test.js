import app from '../../server.js'
import request from 'supertest'
import { test } from '@jest/globals';
import db from '@lotta-llamas/models';

const testWallet1 = {
	address: '14GRxZmNCLHo5Uknr2XYnGA61Hh9uMULXV',
	message: 'The man who stole the world',
	signature: 'H4L8U9PWk0VyL12kJr7xZWbkTzHPEL4K2ByiR8KnfMhlI/XPsNLCgn9OzxTVujljO9hOMDff3e+fUyvbx4UYIAk=',
}

const testWallet2 = {
	address: '1FBuCHMw5e5yTNKbf1eJq1bXZjoGaXeqwV',
	message: 'The man who stole the world',
	signature: 'IKsPcXMdQtIQtu2qjV34rtiwzv7uxo7eZp923u6/61iFJR7EzzeSBWdlp8OyjP3Ywk/8Kr4PvCLtrt0Z2MsXSiA=',
}

function getToken(wallet) {
	const { address, message, signature } = wallet;
	return new Promise((resolve, reject) => {
		request(app)
			.post('/api/validate-wallet')
			.set('Accept', 'application/json')
			.send({ address, message, signature })
			.then((record) => {
				resolve(record.body.token);
			})
	})
}

describe('GET /api/comments', () => {
	test('401 - Content ID malformed', async () => {
		const token1 = await getToken(testWallet1);
		return request(app)
			.get('/api/comments')
			.set('Accept', 'application/json')
			.set({'Authorization': token1, 'Address': testWallet1.address })
			.then((response) => {
				expect(response.statusCode).toBe(401);
				expect(JSON.parse(response.text).error).toBe('Missing contentId or malformed');
			})
	});

	test('401 - Post ID malformed', async () => {
		const token1 = await getToken(testWallet1);
		return request(app)
			.get('/api/comments')
			.query({ contentId: 'Test1' })
			.set('Accept', 'application/json')
			.set({'Authorization': token1, 'Address': testWallet1.address })
			.then((response) => {
				expect(response.statusCode).toBe(401);
				expect(JSON.parse(response.text).error).toBe('Missing postId or malformed');
			})
	});

	// test('200 - Success', async () => {
	// 	const token2 = await getToken(testWallet2);

	// 	const comment = await db.Comment.findOne({
	// 		where: { walletId: testWallet2.address, isDeleted: false }
	// 	});
	// console.log(comment)
	// 	return request(app)
	// 		.get('/api/comments')
	// 		.query({ contentId: 'b8a0bae2-a20c-4c0f-a022-2bfb33a888ed', postId: comment.postId })
	// 		.set('Accept', 'application/json')
	// 		.set({'Authorization': token2, 'Address': testWallet2.address })
	// 		.then((response) => {
	// 			expect(response.statusCode).toBe(200);
	// 			// const record = JSON.parse(response.text).comment;
	// 			// expect(record.comment).toBe('A thoughtful comment');
	// 		})
	// });

})

describe('POST /api/comments', () => {
	test('400 - Post ID malformed', async () => {
		const token1 = await getToken(testWallet1);
		return request(app)
			.post('/api/comments')
			.set('Accept', 'application/json')
			.set({'Authorization': token1, 'Address': testWallet1.address })
			.send({ comment: { postId: '123' }})
			.then((response) => {
				expect(response.statusCode).toBe(400);
				expect(JSON.parse(response.text).error).toBe('Post ID malformed');
			})
	});

	test('404 - Post not found', async () => {
		const token1 = await getToken(testWallet1);
		return request(app)
			.post('/api/comments')
			.set('Accept', 'application/json')
			.set({'Authorization': token1, 'Address': testWallet1.address })
			.send({ comment: { postId: '3fb32686-39a5-4a55-b33a-ea63f5f50fd0' }})
			.then((response) => {
				expect(response.statusCode).toBe(404);
				expect(JSON.parse(response.text).error).toBe('Post not found');
			})
	});

	test('401 - Token not available in wallet', async () => {
		const token = await getToken(testWallet2);
		const post = await db.Post.findOne({ where: { walletId: testWallet1.address }});
		return request(app)
			.post(`/api/comments`)
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet2.address })
			.send({ comment: { postId: post.id }})
			.then((response) => {
				expect(response.statusCode).toBe(401);
				expect(JSON.parse(response.text).error).toBe('Token not available in wallet');
			})
	});

	test('401 - No comment present', async () => {
		const token = await getToken(testWallet1);
		const post = await db.Post.findOne({ where: { walletId: testWallet1.address }});
		return request(app)
			.post(`/api/comments`)
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet1.address })
			.send({ comment: { postId: post.id, comment: null }})
			.then((response) => {
				expect(response.statusCode).toBe(401);
				expect(JSON.parse(response.text).error).toBe('No comment present');
			})
	});

	test('200 - Successfully adds comment record', async () => {
		const token = await getToken(testWallet1);
		const post = await db.Post.findOne({ where: { walletId: testWallet1.address } });
		return request(app)
			.post(`/api/comments`)
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet1.address })
			.send({ comment: { postId: post.id, comment: 'A thoughtful comment' }})
			.then(async (response) => {
				const record = JSON.parse(response.text).comment;
				expect(response.statusCode).toBe(200);
				expect(record.comment).toBe('A thoughtful comment');
				// Clean up
				await db.Comment.destroy({
					where: { id: record.id }
				})
			})
	});
});

describe('PUT /api/comments/:commentId', () => {
	test('500 - Comment ID malformed', async () => {
		const token = await getToken(testWallet1);
		const comment = await db.Comment.findOne({
			where: { walletId: testWallet1.address, isDeleted: false }
		});
		return request(app)
			.put(`/api/comments/123`)
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet1.address })
			.send({ comment: { postId: comment.postId, comment: 'A updated comment' }})
			.then((response) => {
				expect(response.statusCode).toBe(500);
				expect(JSON.parse(response.text).error).toBe('Comment ID malformed');
			})
	});

	test('401 - Comment not found', async () => {
		const token = await getToken(testWallet1);
		const comment = await db.Comment.findOne({
			where: { walletId: testWallet1.address, isDeleted: false }
		});
		return request(app)
			.put(`/api/comments/c47cc844-58c0-4abd-813c-6f0c83749fc2`)
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet1.address })
			.send({ comment: { postId: comment.postId, comment: 'A updated comment' }})
			.then((response) => {
				expect(response.statusCode).toBe(401);
				expect(JSON.parse(response.text).error).toBe('Comment not found');
			})
	});

	test('200 - Success', async () => {
		const token = await getToken(testWallet1);
		const comment = await db.Comment.findOne({
			where: { walletId: testWallet1.address, isDeleted: false }
		});
		return request(app)
			.put(`/api/comments/${comment.id}`)
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet1.address })
			.send({ comment: { postId: comment.postId, comment: 'A updated comment' }})
			.then((response) => {
				const record = JSON.parse(response.text).comment;
				expect(response.statusCode).toBe(200);
				expect(record.comment).toBe('A updated comment');
			})
	});
});

describe('DELETE /api/comments/:commentId', () => {
	test('500 - Comment ID malformed', async () => {
		const token = await getToken(testWallet1);
		return request(app)
			.delete('/api/comments/borked')
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet1.address })
			.then( async (response) => {
				expect(response.statusCode).toBe(500);
				expect(JSON.parse(response.text).error).toBe('Comment ID malformed');
			})
	});

	test('401 - Comment not found', async () => {
		const token = await getToken(testWallet1);
		return request(app)
			.delete('/api/comments/41a5d1cc-1de5-4d71-9d05-e92cc51f34bb')
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet1.address })
			.then( async (response) => {
				expect(response.statusCode).toBe(401);
				expect(JSON.parse(response.text).error).toBe('Comment not found');
			})
	});

	test('200 - Success', async () => {
		const token = await getToken(testWallet1);
		const comments = await db.Comment.findAll({
			where: { walletId: testWallet1.address, isDeleted: false }
		});

		const initialCommentsCount = comments.length;

		return request(app)
			.delete(`/api/comments/${comments[0].id}`)
			.set('Accept', 'application/json')
			.set({'Authorization': token, 'Address': testWallet1.address })
			.then( async (response) => {
				const currentCount = await db.Comment.findAll({
					where: { walletId: testWallet1.address, isDeleted: false }
				});
				expect(initialCommentsCount).toBe(currentCount.length + 1);
				expect(response.statusCode).toBe(200);
				// Clean up
				await db.Comment.update({
					isDeleted: false
				}, {
					where: { id: comments[0].id }
				})
			})
	});
})
