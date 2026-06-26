const { test, expect } = require('@playwright/test');

test('documents review workspace release smoke', async ({ page }) => {
	const pageErrors = [];
	const requestFailures = [];

	page.on('pageerror', (error) => {
		pageErrors.push(error.message);
	});

	page.on('requestfailed', (request) => {
		const url = request.url();
		if (url.includes('favicon')) {
			return;
		}

		requestFailures.push({
			url,
			failure: request.failure() ? request.failure().errorText : 'unknown'
		});
	});

	await page.goto('/Home/Documents');
	await expect(page.getByRole('heading', { name: 'v2.3 alpha: review workflows' })).toBeVisible();

	await page.waitForFunction(() => {
		return window.editor1 &&
			typeof window.editor1.getJSON === 'function' &&
			window.editor1.getJSON &&
			window.editor1.getJSON().type === 'doc';
	});
	await expect(page.locator('#statusBanner')).toContainText('Document workspace ready.');

	await page.getByRole('button', { name: 'Command palette' }).click();
	await expect(page.locator('#commandPaletteOverlay')).toBeVisible();
	await page.locator('#commandPaletteInput').fill('insert callout');
	await page.keyboard.press('Enter');
	await expect(page.locator('#playgroundInsertSummary')).toContainText('Callout inserted into the current draft.');

	await page.locator('#documentTitle').fill('UI smoke release document');
	await page.getByRole('button', { name: 'Create document' }).click();
	await expect(page.locator('#statusBanner')).toContainText('Created document');

	const documentId = await page.locator('#documentId').inputValue();
	expect(documentId).toMatch(/^doc_/);
	await expect(page.locator('#compareLatestRevisionButton')).toBeEnabled();

	await page.evaluate(() => {
		const headingText = 'v2.3 alpha review workspace';
		const editorDocument = window.editor1.document;
		const walker = editorDocument.createTreeWalker(editorDocument.body, NodeFilter.SHOW_TEXT);
		let targetNode = null;
		while ((targetNode = walker.nextNode())) {
			const value = targetNode.nodeValue || '';
			const startIndex = value.indexOf(headingText);
			if (startIndex >= 0) {
				const range = editorDocument.createRange();
				range.setStart(targetNode, startIndex + headingText.length);
				range.collapse(true);
				const selection = editorDocument.defaultView.getSelection();
				selection.removeAllRanges();
				selection.addRange(range);
				return;
			}
		}

		throw new Error('Heading text not found for block tools test');
	});

	await page.getByRole('button', { name: 'Block tools' }).click();
	await expect(page.locator('#blockToolsBar')).toBeVisible();
	await page.getByRole('button', { name: 'Duplicate' }).click();
	await expect(page.locator('#statusBanner')).toContainText('Duplicated the current block.');
	await expect.poll(async () => {
		return await page.evaluate(() => {
			return (window.editor1.getJSON().content || []).filter((node) => node.type === 'heading').length;
		});
	}).toBeGreaterThan(1);
	await expect(page.locator('#documentOutlineSummary')).toContainText('Current section');
	await expect(page.locator('#documentOutlineList .outline-item').first()).toContainText('v2.3 alpha review workspace');
	await page.locator('#findQueryInput').fill('WebSocket room');
	await expect(page.locator('#findSummary')).toContainText('match');
	await expect(page.locator('#findMatchList .find-match').first()).toContainText('WebSocket room');
	await page.locator('#findReplaceInput').fill('Realtime room');
	await page.getByRole('button', { name: 'Replace current' }).click();
	await expect(page.locator('#statusBanner')).toContainText('Replaced search match');
	await page.waitForFunction(() => {
		const documentModel = window.editor1.getJSON();
		return JSON.stringify(documentModel).includes('Realtime room');
	});

	await page.evaluate(() => {
		const editorDocument = window.editor1.document;
		const walker = editorDocument.createTreeWalker(editorDocument.body, NodeFilter.SHOW_TEXT);
		let lastNode = null;
		while (walker.nextNode()) {
			lastNode = walker.currentNode;
		}

		if (!lastNode) {
			throw new Error('Unable to place caret for slash menu test');
		}

		const range = editorDocument.createRange();
		range.setStart(lastNode, lastNode.nodeValue.length);
		range.collapse(true);
		const selection = editorDocument.defaultView.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	});

	await page.getByRole('button', { name: 'Slash menu' }).click();
	await expect(page.locator('#slashCommandMenu')).toBeVisible();
	await page.evaluate(() => {
		const entry = (window.slashCommandVisibleCommands || []).find((command) => command && command.id === 'slash-checklist');
		if (!entry || typeof window.executeSlashCommand !== 'function') {
			throw new Error('Slash checklist command is not available');
		}

		window.executeSlashCommand(entry);
	});
	await expect(page.locator('#playgroundInsertSummary')).toContainText('Checklist inserted into the current draft.');

	await page.evaluate(() => {
		const anchorText = 'structured JSON document';
		const editorDocument = window.editor1.document;
		const walker = editorDocument.createTreeWalker(editorDocument.body, NodeFilter.SHOW_TEXT);
		let targetNode = null;
		while ((targetNode = walker.nextNode())) {
			const value = targetNode.nodeValue || '';
			const startIndex = value.indexOf(anchorText);
			if (startIndex >= 0) {
				const range = editorDocument.createRange();
				range.setStart(targetNode, startIndex);
				range.setEnd(targetNode, startIndex + anchorText.length);
				const selection = editorDocument.defaultView.getSelection();
				selection.removeAllRanges();
				selection.addRange(range);
				window.refreshSelectionActionBar();
				return;
			}
		}

		throw new Error('Anchor text not found in editor');
	});

	await expect(page.locator('#selectionActionBar')).toBeVisible();
	await expect(page.locator('#selectionActionPreview')).toContainText('structured JSON document');
	await page.locator('#selectionActionBar').getByRole('button', { name: 'Suggest', exact: true }).click();
	await expect(page.locator('#suggestionAnchorInput')).toHaveValue('structured JSON document');

	await page.locator('#suggestionBodyInput').fill('UI smoke suggestion note');
	await page.locator('#suggestedTextInput').fill('structured review document');
	await page.getByRole('button', { name: 'Add suggestion' }).click();

	const suggestionCard = page.locator('#suggestionList .suggestion-card').first();
	await expect(suggestionCard).toBeVisible();
	await expect(suggestionCard).toContainText('UI smoke suggestion note');
	await expect(suggestionCard.locator('.review-section-chip')).toContainText('v2.3 alpha review workspace');
	await suggestionCard.getByRole('button', { name: 'Comment' }).click();

	await expect(page.locator('#commentSuggestionMeta')).toContainText('will stay linked to the');
	await expect(page.locator('#commentAnchorInput')).toHaveValue('structured JSON document');

	await page.locator('#commentBodyInput').fill('UI smoke linked comment');
	await page.getByRole('button', { name: 'Add thread' }).click();

	const commentThread = page.locator('#commentThreadList .comment-thread').first();
	await expect(commentThread).toBeVisible();
	await expect(commentThread).toContainText('UI smoke linked comment');
	await expect(commentThread.getByRole('button', { name: 'Open suggestion' })).toBeVisible();
	await expect(page.locator('#reviewQueueSummary')).toContainText('2 open review item');
	await expect(page.locator('#reviewQueueSummary')).toContainText('Alt+Shift+A');
	await page.getByRole('button', { name: 'Next issue' }).click();
	const activeReviewQueueItem = page.locator('#reviewQueueList .review-queue-item.active');
	await expect(activeReviewQueueItem).toBeVisible();
	await expect.poll(async () => {
		return await activeReviewQueueItem.locator('button').count();
	}).toBeGreaterThan(0);
	const reviewOutlineItem = page.locator('#documentOutlineList .outline-item').filter({ hasText: 'open suggestion' }).first();
	await expect(reviewOutlineItem).toBeVisible();
	await reviewOutlineItem.getByRole('button', { name: 'Review' }).click();
	await expect(page.locator('#suggestionCurrentSectionOnly')).toBeChecked();

	await page.evaluate(() => {
		window.scheduleEditorHighlightRefresh();
	});

	await expect.poll(async () => {
		return await page.locator('#editorHighlightLayer .editor-highlight-marker-wrap.suggestion').count();
	}).toBeGreaterThan(0);

	await page.evaluate(() => {
		const documentModel = window.editor1.getJSON();
		documentModel.content.push({
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'UI smoke saved revision line.' }
			]
		});
		window.editor1.setJSON(documentModel);
		window.hasUnsavedChanges = true;
		window.refreshEditorState();
		window.scheduleCommentAnchorRefresh();
		window.scheduleEditorHighlightRefresh();
		window.scheduleRevisionCompareRefresh();
	});

	await page.getByRole('button', { name: 'Save document' }).click();
	await expect(page.locator('#statusBanner')).toContainText('Saved document');

	await page.evaluate(() => {
		const documentModel = window.editor1.getJSON();
		documentModel.content.push({
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'UI smoke unsaved compare line.' }
			]
		});
		window.editor1.setJSON(documentModel);
		window.hasUnsavedChanges = true;
		window.refreshEditorState();
		window.scheduleCommentAnchorRefresh();
		window.scheduleEditorHighlightRefresh();
		window.scheduleRevisionCompareRefresh();
	});

	await page.locator('#compareLatestRevisionButton').click();
	await expect(page.locator('#revisionCompareDetails .revision-compare-row').first()).toBeVisible();

	await page.locator('#markdownEditorInput').fill('# UI smoke markdown\n\n- Imported change\n- Review ready');
	await page.getByRole('button', { name: 'Refresh preview' }).click();
	await expect(page.locator('#markdownLabHtmlPreview')).toContainText('UI smoke markdown');
	await page.getByRole('button', { name: 'Replace draft' }).click();
	await expect(page.locator('#statusBanner')).toContainText('Replaced the draft from Markdown');
	await page.waitForFunction(() => {
		const documentModel = window.editor1.getJSON();
		return JSON.stringify(documentModel).includes('UI smoke markdown');
	});

	expect(pageErrors).toEqual([]);
	expect(requestFailures).toEqual([]);
});

test('ai provider settings ask ai dialog smoke', async ({ page }) => {
	const pageErrors = [];
	const requestFailures = [];

	page.on('pageerror', (error) => {
		pageErrors.push(error.message);
	});

	page.on('requestfailed', (request) => {
		const url = request.url();
		if (url.includes('favicon')) {
			return;
		}

		requestFailures.push({
			url,
			failure: request.failure() ? request.failure().errorText : 'unknown'
		});
	});

	await page.goto('/Home/AiProviderSettings');
	await expect(page.getByRole('heading', { name: 'AI Provider Settings (BYOK)' })).toBeVisible();
	await expect(page.locator('#byokActiveChip')).toContainText('Demo resolver');

	await page.waitForFunction(() => {
		return window.__mvcAiProviderDemoReady === true &&
			window.editor1 &&
			window.editor1.aiToolkit &&
			typeof window.editor1.aiToolkit.openDialog === 'function' &&
			typeof window.editor1.aiToolkit.runQuickAction === 'function';
	});

	await page.locator('#btnOpenDialog').click();
	await expect(page.locator('.demo-ai-apply-guidance')).toBeVisible();
	await expect(page.locator('.demo-ai-apply-guidance-title')).toContainText('Best next step');
	await expect(page.locator('.demo-ai-apply-guidance-badge')).toContainText('Ask AI');
	await expect(page.locator('.demo-ai-apply-guidance-detail')).toContainText('Generate a new AI suggestion');

	await page.locator('.demo-ai-run-row button.is-primary').click();

	await page.waitForFunction(() => {
		const panel = document.querySelector('.rte-panel-aiassist');
		const resultAreas = panel ? panel.querySelectorAll('textarea') : null;
		const detailNode = panel ? panel.querySelector('.demo-ai-apply-guidance-detail') : null;
		const badgeNode = panel ? panel.querySelector('.demo-ai-apply-guidance-badge') : null;
		const recommendedNode = panel ? panel.querySelector('[data-rte-ai-dialog-recommended="true"]') : null;
		const resultValue = resultAreas && resultAreas.length > 1 ? (resultAreas[1].value || '') : '';
		return !!(
			resultValue &&
			badgeNode &&
			!/^ask ai$/i.test((badgeNode.textContent || '').trim()) &&
			detailNode &&
			/other available actions:/i.test(detailNode.textContent || '') &&
			recommendedNode &&
			/other available actions:/i.test(recommendedNode.getAttribute('aria-label') || '')
		);
	});

	const dialogState = await page.evaluate(() => {
		const panel = document.querySelector('.rte-panel-aiassist');
		const statusNode = panel ? panel.querySelector('.demo-ai-status-text') : null;
		const guidanceTitle = panel ? panel.querySelector('.demo-ai-apply-guidance-title') : null;
		const guidanceBadge = panel ? panel.querySelector('.demo-ai-apply-guidance-badge') : null;
		const guidanceDetail = panel ? panel.querySelector('.demo-ai-apply-guidance-detail') : null;
		const recommendedNode = panel ? panel.querySelector('[data-rte-ai-dialog-recommended="true"]') : null;
		const resultAreas = panel ? panel.querySelectorAll('textarea') : [];
		return {
			statusText: statusNode ? statusNode.textContent.trim() : '',
			guidanceTitle: guidanceTitle ? guidanceTitle.textContent.trim() : '',
			guidanceBadge: guidanceBadge ? guidanceBadge.textContent.trim() : '',
			guidanceDetail: guidanceDetail ? guidanceDetail.textContent.trim() : '',
			resultText: resultAreas.length > 1 ? (resultAreas[1].value || '').trim() : '',
			recommendedActionText: recommendedNode ? recommendedNode.textContent.trim() : '',
			recommendedActionAria: recommendedNode ? (recommendedNode.getAttribute('aria-label') || '') : ''
		};
	});

	expect(dialogState.guidanceTitle).toMatch(/best next step/i);
	expect(dialogState.guidanceBadge).toMatch(/apply|insert|preview|replace/i);
	expect(dialogState.resultText).not.toEqual('');
	expect(dialogState.guidanceDetail).toMatch(/other available actions:/i);
	expect(dialogState.recommendedActionAria).toMatch(/recommended next step/i);
	expect(dialogState.recommendedActionAria).toMatch(/other available actions:/i);
	expect(dialogState.recommendedActionText).not.toEqual('');

	expect(pageErrors).toEqual([]);
	expect(requestFailures).toEqual([]);
});
