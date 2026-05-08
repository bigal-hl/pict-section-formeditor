const libPictView = require('pict-view');
const libPictSectionFlow = require('pict-section-flow');
const libPictSectionModal = require('pict-section-modal');

/**
 * PictView-FormEditor-SolutionMap
 *
 * Renders a pict-section-flow diagram showing all solvers as connected cards
 * in execution order.  Each card displays the assignment destination, a
 * truncated expression, and (when available) the last solved value.
 *
 * Clicking a card navigates to the Solver Editor tab for that solver.
 * Hovering shows a rich tooltip with full solver details.
 */
class PictViewFormEditorSolutionMap extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this._ParentFormEditor = null;
		this._FlowView = null;
		this._ModalView = null;

		// Track active tooltip handles for cleanup
		this._ActiveTooltips = [];
	}

	/* ---------------------------------------------------------------------- */
	/*  Helpers                                                                */
	/* ---------------------------------------------------------------------- */

	/**
	 * Truncate a string to pMaxLen characters with an ellipsis.
	 */
	_truncate(pText, pMaxLen)
	{
		if (!pText) return '';
		if (pText.length <= pMaxLen) return pText;
		return pText.substring(0, pMaxLen) + '\u2026';
	}

	/**
	 * Minimal HTML escaping for attribute/content safety.
	 */
	_escapeHTML(pText)
	{
		if (!pText) return '';
		return pText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	/**
	 * Parse the assignment destination (LHS of '=') from a solver expression.
	 * Returns the hash or null if there is no assignment.
	 */
	_parseAssignmentHash(pExpression)
	{
		if (!pExpression) return null;
		let tmpEqIndex = pExpression.indexOf('=');
		if (tmpEqIndex < 0) return null;
		// Make sure this is not == or !=
		if (pExpression[tmpEqIndex + 1] === '=' || (tmpEqIndex > 0 && pExpression[tmpEqIndex - 1] === '!'))
		{
			return null;
		}
		let tmpLeft = pExpression.substring(0, tmpEqIndex).trim();
		// Only a simple identifier is a valid assignment hash
		if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(tmpLeft))
		{
			return tmpLeft;
		}
		return null;
	}

	/**
	 * Build a unique node hash for a solver expression entry.
	 */
	_solverNodeHash(pExprObj)
	{
		let tmpGroupPart = (pExprObj.GroupIndex >= 0) ? `-g${pExprObj.GroupIndex}` : '';
		return `solver-s${pExprObj.SectionIndex}${tmpGroupPart}-i${pExprObj.SolverIndex}`;
	}

	/* ---------------------------------------------------------------------- */
	/*  Layout                                                                 */
	/* ---------------------------------------------------------------------- */

	/**
	 * Position nodes left-to-right using topological layers, keeping children
	 * vertically proximal to their parents rather than stacking from the top.
	 *
	 * @param {Array} pNodes
	 * @param {Array} pConnections
	 */
	_layoutNodes(pNodes, pConnections)
	{
		if (!pNodes || pNodes.length === 0) return;

		let tmpHorizontalSpacing = 260;
		let tmpVerticalSpacing = 30;
		let tmpStartX = 60;
		let tmpStartY = 60;
		let tmpNodeHeight = 90;
		let tmpNodeWidth = 220;

		// Build adjacency
		let tmpNodeMap = {};
		let tmpInDegree = {};
		let tmpOutEdges = {};
		let tmpInEdges = {};

		for (let i = 0; i < pNodes.length; i++)
		{
			let tmpNode = pNodes[i];
			tmpNodeMap[tmpNode.Hash] = tmpNode;
			tmpInDegree[tmpNode.Hash] = 0;
			tmpOutEdges[tmpNode.Hash] = [];
			tmpInEdges[tmpNode.Hash] = [];
		}

		for (let i = 0; i < pConnections.length; i++)
		{
			let tmpConn = pConnections[i];
			if (tmpInDegree.hasOwnProperty(tmpConn.TargetNodeHash))
			{
				tmpInDegree[tmpConn.TargetNodeHash]++;
				tmpInEdges[tmpConn.TargetNodeHash].push(tmpConn.SourceNodeHash);
			}
			if (tmpOutEdges.hasOwnProperty(tmpConn.SourceNodeHash))
			{
				tmpOutEdges[tmpConn.SourceNodeHash].push(tmpConn.TargetNodeHash);
			}
		}

		// Topological sort into layers (Kahn's algorithm)
		let tmpLayers = [];
		let tmpQueue = [];
		let tmpAssigned = {};

		for (let tmpHash in tmpInDegree)
		{
			if (tmpInDegree[tmpHash] === 0)
			{
				tmpQueue.push(tmpHash);
			}
		}

		while (tmpQueue.length > 0)
		{
			let tmpCurrentLayer = [];
			let tmpNextQueue = [];

			for (let i = 0; i < tmpQueue.length; i++)
			{
				let tmpNodeHash = tmpQueue[i];
				if (tmpAssigned[tmpNodeHash]) continue;

				tmpAssigned[tmpNodeHash] = true;
				tmpCurrentLayer.push(tmpNodeHash);

				let tmpEdges = tmpOutEdges[tmpNodeHash] || [];
				for (let j = 0; j < tmpEdges.length; j++)
				{
					let tmpTargetHash = tmpEdges[j];
					tmpInDegree[tmpTargetHash]--;
					if (tmpInDegree[tmpTargetHash] <= 0 && !tmpAssigned[tmpTargetHash])
					{
						tmpNextQueue.push(tmpTargetHash);
					}
				}
			}

			if (tmpCurrentLayer.length > 0)
			{
				tmpLayers.push(tmpCurrentLayer);
			}

			tmpQueue = tmpNextQueue;
		}

		// Handle remaining unassigned nodes (cycles or disconnected)
		for (let i = 0; i < pNodes.length; i++)
		{
			if (!tmpAssigned[pNodes[i].Hash])
			{
				// Place disconnected nodes in their own layer at the end
				tmpLayers.push([pNodes[i].Hash]);
				tmpAssigned[pNodes[i].Hash] = true;
			}
		}

		// Assign X positions by layer
		let tmpNodeLayer = {};
		for (let l = 0; l < tmpLayers.length; l++)
		{
			for (let i = 0; i < tmpLayers[l].length; i++)
			{
				tmpNodeLayer[tmpLayers[l][i]] = l;
			}
		}

		// Assign Y positions: children target the average Y of their parents.
		// First layer is simply spaced evenly.  Subsequent layers position each
		// node at the mean Y of its parents, then resolve overlaps.
		let tmpPositionMap = {};

		for (let l = 0; l < tmpLayers.length; l++)
		{
			let tmpLayer = tmpLayers[l];
			let tmpX = tmpStartX + l * (tmpNodeWidth + tmpHorizontalSpacing);

			if (l === 0)
			{
				// First layer: space evenly
				for (let i = 0; i < tmpLayer.length; i++)
				{
					tmpPositionMap[tmpLayer[i]] = { X: tmpX, Y: tmpStartY + i * (tmpNodeHeight + tmpVerticalSpacing) };
				}
			}
			else
			{
				// Compute ideal Y as average of parents' Y positions
				let tmpIdealPositions = [];
				for (let i = 0; i < tmpLayer.length; i++)
				{
					let tmpHash = tmpLayer[i];
					let tmpParents = tmpInEdges[tmpHash] || [];
					let tmpIdealY;

					if (tmpParents.length > 0)
					{
						let tmpSum = 0;
						for (let p = 0; p < tmpParents.length; p++)
						{
							tmpSum += tmpPositionMap[tmpParents[p]].Y;
						}
						tmpIdealY = tmpSum / tmpParents.length;
					}
					else
					{
						// No parents in this layer — use a default position
						tmpIdealY = tmpStartY + i * (tmpNodeHeight + tmpVerticalSpacing);
					}

					tmpIdealPositions.push({ Hash: tmpHash, X: tmpX, Y: tmpIdealY });
				}

				// Sort by ideal Y so we process top-to-bottom
				tmpIdealPositions.sort(function (a, b) { return a.Y - b.Y; });

				// Resolve overlaps: ensure each node is at least (nodeHeight + spacing) below the previous
				for (let i = 1; i < tmpIdealPositions.length; i++)
				{
					let tmpMinY = tmpIdealPositions[i - 1].Y + tmpNodeHeight + tmpVerticalSpacing;
					if (tmpIdealPositions[i].Y < tmpMinY)
					{
						tmpIdealPositions[i].Y = tmpMinY;
					}
				}

				// Store positions
				for (let i = 0; i < tmpIdealPositions.length; i++)
				{
					tmpPositionMap[tmpIdealPositions[i].Hash] = { X: tmpIdealPositions[i].X, Y: tmpIdealPositions[i].Y };
				}
			}
		}

		// Apply positions to nodes
		for (let i = 0; i < pNodes.length; i++)
		{
			let tmpPos = tmpPositionMap[pNodes[i].Hash];
			if (tmpPos)
			{
				pNodes[i].X = tmpPos.X;
				pNodes[i].Y = tmpPos.Y;
			}
		}
	}

	/* ---------------------------------------------------------------------- */
	/*  Tooltip management                                                     */
	/* ---------------------------------------------------------------------- */

	_destroyTooltips()
	{
		for (let i = 0; i < this._ActiveTooltips.length; i++)
		{
			if (this._ActiveTooltips[i] && typeof this._ActiveTooltips[i].destroy === 'function')
			{
				this._ActiveTooltips[i].destroy();
			}
		}
		this._ActiveTooltips = [];
	}

	_ensureModal()
	{
		if (this._ModalView) return this._ModalView;

		// Try to find an existing modal view
		this._ModalView = this.pict.views.PictSectionModal;
		if (!this._ModalView)
		{
			// Create one as a singleton
			this._ModalView = this.pict.addView('PictSectionModal', {}, libPictSectionModal);
		}
		return this._ModalView;
	}

	/* ---------------------------------------------------------------------- */
	/*  Flow data generation                                                   */
	/* ---------------------------------------------------------------------- */

	/**
	 * Transform the solver health report into pict-section-flow Nodes and
	 * Connections suitable for the DataManager.
	 *
	 * @returns {{ Nodes: Array, Connections: Array }}
	 */
	_buildFlowData()
	{
		let tmpPropsPanel = this._ParentFormEditor._PropertiesPanelView;
		if (!tmpPropsPanel)
		{
			return { Nodes: [], Connections: [] };
		}

		let tmpReport = tmpPropsPanel._buildSolverHealthReport();
		let tmpExpressions = tmpReport.AllExpressions || [];

		// Sort by ordinal ascending (health report already collects them)
		tmpExpressions.sort(function (a, b) { return a.Ordinal - b.Ordinal; });

		let tmpNodes = [];
		// Map: assignmentHash → nodeHash (for building connections)
		let tmpAssignmentToNode = {};
		// Map: nodeHash → expression object (for connections)
		let tmpNodeToExprObj = {};
		// Map: nodeHash → array of referenced hashes (for connections)
		let tmpNodeReferencedHashes = {};

		for (let i = 0; i < tmpExpressions.length; i++)
		{
			let tmpExprObj = tmpExpressions[i];
			let tmpNodeHash = this._solverNodeHash(tmpExprObj);
			let tmpAssignHash = this._parseAssignmentHash(tmpExprObj.Expression);

			let tmpTitle = tmpAssignHash || 'Expression';
			let tmpTypeLabel = (tmpExprObj.Type === 'Group') ? 'Group' : 'Section';
			let tmpLocationLabel = tmpExprObj.SectionName || '';
			if (tmpExprObj.GroupName)
			{
				tmpLocationLabel += ' \u203A ' + tmpExprObj.GroupName;
			}

			let tmpBodyExpression = tmpExprObj.Expression;
			// For assignment expressions, show only the RHS in the card body
			if (tmpAssignHash)
			{
				let tmpEqIdx = tmpExprObj.Expression.indexOf('=');
				tmpBodyExpression = tmpExprObj.Expression.substring(tmpEqIdx + 1).trim();
			}

			tmpNodes.push(
			{
				Hash: tmpNodeHash,
				Type: 'solver',
				X: 0,
				Y: 0,
				Width: 220,
				Height: 90,
				Title: tmpTitle,
				Ports:
				[
					{ Hash: tmpNodeHash + '-in', Direction: 'input', Side: 'left', Label: 'In' },
					{ Hash: tmpNodeHash + '-out', Direction: 'output', Side: 'right', Label: 'Out' }
				],
				Data:
				{
					Expression: tmpExprObj.Expression,
					BodyExpression: tmpBodyExpression,
					AssignmentHash: tmpAssignHash,
					Ordinal: tmpExprObj.Ordinal,
					Type: tmpExprObj.Type,
					SectionIndex: tmpExprObj.SectionIndex,
					SolverIndex: tmpExprObj.SolverIndex,
					GroupIndex: tmpExprObj.GroupIndex,
					SectionName: tmpExprObj.SectionName,
					GroupName: tmpExprObj.GroupName,
					TypeLabel: tmpTypeLabel,
					LocationLabel: tmpLocationLabel
				}
			});

			if (tmpAssignHash)
			{
				tmpAssignmentToNode[tmpAssignHash] = tmpNodeHash;
			}

			tmpNodeToExprObj[tmpNodeHash] = tmpExprObj;

			// Collect referenced hashes from the expression by scanning against
			// all known descriptor hashes from the SolverMap
			let tmpRefHashes = [];
			let tmpSolverMapKeys = Object.keys(tmpReport.SolverMap || {});
			for (let k = 0; k < tmpSolverMapKeys.length; k++)
			{
				let tmpHash = tmpSolverMapKeys[k];
				// Skip the assignment hash itself
				if (tmpHash === tmpAssignHash) continue;
				if (tmpExprObj.Expression.indexOf(tmpHash) >= 0)
				{
					tmpRefHashes.push(tmpHash);
				}
			}
			tmpNodeReferencedHashes[tmpNodeHash] = tmpRefHashes;
		}

		// Build connections: if solver B references hash H, and solver A assigns H, connect A → B
		let tmpConnections = [];
		let tmpConnIndex = 0;
		let tmpSeenConnections = {};

		for (let i = 0; i < tmpNodes.length; i++)
		{
			let tmpTargetNode = tmpNodes[i];
			let tmpRefHashes = tmpNodeReferencedHashes[tmpTargetNode.Hash] || [];

			for (let r = 0; r < tmpRefHashes.length; r++)
			{
				let tmpSourceNodeHash = tmpAssignmentToNode[tmpRefHashes[r]];
				if (!tmpSourceNodeHash || tmpSourceNodeHash === tmpTargetNode.Hash) continue;

				let tmpConnKey = tmpSourceNodeHash + '->' + tmpTargetNode.Hash;
				if (tmpSeenConnections[tmpConnKey]) continue;
				tmpSeenConnections[tmpConnKey] = true;

				tmpConnections.push(
				{
					Hash: 'conn-' + tmpConnIndex,
					SourceNodeHash: tmpSourceNodeHash,
					SourcePortHash: tmpSourceNodeHash + '-out',
					TargetNodeHash: tmpTargetNode.Hash,
					TargetPortHash: tmpTargetNode.Hash + '-in',
					Data: {}
				});
				tmpConnIndex++;
			}
		}

		return { Nodes: tmpNodes, Connections: tmpConnections };
	}

	/* ---------------------------------------------------------------------- */
	/*  Rendering                                                              */
	/* ---------------------------------------------------------------------- */

	/**
	 * Build or rebuild the Solution Map flow diagram.
	 */
	renderSolutionMap()
	{
		let tmpParentHash = this._ParentFormEditor.Hash;
		let tmpContainerId = `FormEditor-SolutionMap-Container-${tmpParentHash}`;

		// Clean up previous tooltips
		this._destroyTooltips();

		let tmpFlowData = this._buildFlowData();

		if (tmpFlowData.Nodes.length === 0)
		{
			this.pict.ContentAssignment.assignContent(
				`#${tmpContainerId}`,
				'<div class="pict-fe-props-placeholder">No solvers defined. Add solvers to see the Solution Map.</div>'
			);
			return;
		}

		// Always recreate the flow view — the container DOM is replaced on
		// each full render(), so any previous SVG element is stale.
		this._createFlowView(tmpParentHash, tmpContainerId);

		// Set flow data and render
		let tmpDataManager = this._FlowView._DataManager;
		tmpDataManager.setFlowData(
		{
			Nodes: tmpFlowData.Nodes,
			Connections: tmpFlowData.Connections,
			OpenPanels: [],
			SavedLayouts: [],
			ViewState: { PanX: 0, PanY: 0, Zoom: 1, SelectedNodeHash: null, SelectedConnectionHash: null, SelectedTetherHash: null }
		});

		// Layout nodes so connected cards stay horizontally proximal
		this._layoutNodes(tmpFlowData.Nodes, tmpFlowData.Connections);

		this._FlowView.render();

		// Attach tooltips and click handlers after render
		let tmpSelf = this;
		// Use a small delay to ensure the DOM has updated
		setTimeout(function ()
		{
			tmpSelf._attachTooltips(tmpFlowData.Nodes);
			tmpSelf._attachClickHandlers(tmpFlowData.Nodes);
		}, 100);
	}

	/**
	 * Create the pict-section-flow child view.
	 */
	_createFlowView(pParentHash, pContainerId)
	{
		let tmpFlowHash = `${pParentHash}-SolutionMapFlow`;

		// Register the custom "solver" node type
		let tmpSolverNodeType =
		{
			Hash: 'solver',
			Label: 'Solver',
			DefaultWidth: 220,
			DefaultHeight: 90,
			DefaultPorts:
			[
				{ Direction: 'input', Side: 'left', Label: 'In' },
				{ Direction: 'output', Side: 'right', Label: 'Out' }
			],
			TitleBarColor: '#5A7F9E',
			BodyStyle:
			{
				fill: '#F5F0E8',
				stroke: '#B0A89E'
			},
			BodyContent:
			{
				ContentType: 'html',
				Template: '<div class="pict-fe-solutionmap-card-body">' +
					'<div class="pict-fe-solutionmap-card-expr">{~Data:Record.Data.BodyExpression~}</div>' +
					'<div class="pict-fe-solutionmap-card-meta">' +
						'<span class="pict-fe-solutionmap-card-ordinal">#{~Data:Record.Data.Ordinal~}</span>' +
						'<span class="pict-fe-solutionmap-card-type">{~Data:Record.Data.TypeLabel~}</span>' +
					'</div>' +
				'</div>',
				Padding: 4
			},
			ShowTypeLabel: false,
			CardMetadata:
			{
				Name: 'Solver',
				Code: 'SOLVE',
				Description: 'A solver expression',
				Category: 'Solver',
				Enabled: false
			}
		};

		let tmpNodeTypes = { solver: tmpSolverNodeType };

		this._FlowView = this.pict.addView(
			tmpFlowHash,
			{
				ViewIdentifier: tmpFlowHash,
				DefaultRenderable: 'Flow-Container',
				DefaultDestinationAddress: `#${pContainerId}`,
				TargetElementAddress: `#${pContainerId}`,
				AutoRender: false,
				RenderOnLoad: false,
				EnableToolbar: false,
				EnablePanning: true,
				EnableZooming: true,
				EnableNodeDragging: true,
				EnableConnectionCreation: false,
				EnableAddNode: false,
				EnableCardPalette: false,
				EnableGridSnap: false,
				NodeTypes: tmpNodeTypes,
				IncludeDefaultNodeTypes: false,
				CSS: this._getSolutionMapCSS()
			},
			libPictSectionFlow
		);

		this._FlowView.initialize();
	}

	/**
	 * Attach rich tooltips to each solver node element.
	 */
	_attachTooltips(pNodes)
	{
		let tmpModal = this._ensureModal();
		if (!tmpModal || typeof tmpModal.richTooltip !== 'function') return;

		for (let i = 0; i < pNodes.length; i++)
		{
			let tmpNode = pNodes[i];
			let tmpData = tmpNode.Data;

			// Find the node DOM element (pict-section-flow renders nodes as SVG groups with data-node-hash)
			let tmpElements = this.pict.ContentAssignment.getElement(`[data-node-hash="${tmpNode.Hash}"]`);
			let tmpEl = (Array.isArray(tmpElements) && tmpElements.length > 0) ? tmpElements[0] : tmpElements;

			if (!tmpEl) continue;

			let tmpHTML = '<div class="pict-fe-solutionmap-tooltip">';
			tmpHTML += '<div class="pict-fe-solutionmap-tooltip-header">';
			if (tmpData.AssignmentHash)
			{
				tmpHTML += '<strong>' + this._escapeHTML(tmpData.AssignmentHash) + '</strong>';
			}
			else
			{
				tmpHTML += '<strong>Expression</strong>';
			}
			tmpHTML += '</div>';
			tmpHTML += '<div class="pict-fe-solutionmap-tooltip-expr">' + this._escapeHTML(tmpData.Expression) + '</div>';
			tmpHTML += '<div class="pict-fe-solutionmap-tooltip-details">';
			tmpHTML += '<span>Ordinal: ' + tmpData.Ordinal + '</span>';
			tmpHTML += '<span>' + this._escapeHTML(tmpData.TypeLabel) + '</span>';
			if (tmpData.LocationLabel)
			{
				tmpHTML += '<span>' + this._escapeHTML(tmpData.LocationLabel) + '</span>';
			}
			tmpHTML += '</div>';
			tmpHTML += '</div>';

			let tmpHandle = tmpModal.richTooltip(tmpEl, tmpHTML,
			{
				position: 'top',
				delay: 200,
				maxWidth: '400px',
				interactive: false
			});
			this._ActiveTooltips.push(tmpHandle);
		}
	}

	/**
	 * Attach click handlers to solver nodes to navigate to the Solver Editor.
	 */
	_attachClickHandlers(pNodes)
	{
		let tmpSelf = this;

		// Use the flow view's event handler if available
		if (this._FlowView && this._FlowView._EventHandlerProvider)
		{
			this._FlowView._EventHandlerProvider.registerHandler('onNodeSelected',
				function (pNode)
				{
					if (!pNode || !pNode.Data) return;
					tmpSelf._navigateToSolver(pNode.Data);
				},
				'SolutionMapNavigation'
			);
		}
	}

	/**
	 * Navigate to the Solver Editor tab for a given solver.
	 */
	_navigateToSolver(pSolverData)
	{
		if (!this._ParentFormEditor || !this._ParentFormEditor._PropertiesPanelView) return;

		this._ParentFormEditor.switchTab('solvereditor');

		let tmpGroupIndex = (pSolverData.GroupIndex >= 0) ? pSolverData.GroupIndex : undefined;

		this._ParentFormEditor._PropertiesPanelView.openSolverEditor(
			pSolverData.Type,
			pSolverData.SectionIndex,
			pSolverData.SolverIndex,
			tmpGroupIndex
		);
	}

	/**
	 * Return custom CSS for the Solution Map cards.
	 */
	_getSolutionMapCSS()
	{
		return `
.pict-fe-solutionmap-card-body {
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	font-size: 11px;
	color: var(--theme-color-text-primary, #3D3229);
	padding: 2px 4px;
	overflow: hidden;
}
.pict-fe-solutionmap-card-expr {
	font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
	font-size: 10px;
	color: #5A4A3A;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 200px;
	margin-bottom: 4px;
}
.pict-fe-solutionmap-card-meta {
	display: flex;
	gap: 8px;
	font-size: 10px;
	color: #8A7A6A;
}
.pict-fe-solutionmap-card-ordinal {
	font-weight: 600;
	color: #D4A373;
}
.pict-fe-solutionmap-card-type {
	font-style: italic;
}
.pict-fe-solutionmap-tooltip {
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	font-size: 12px;
	color: var(--theme-color-text-primary, #3D3229);
	max-width: 380px;
}
.pict-fe-solutionmap-tooltip-header {
	font-size: 13px;
	margin-bottom: 4px;
}
.pict-fe-solutionmap-tooltip-expr {
	font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
	font-size: 11px;
	color: #5A4A3A;
	background: #F5F0E8;
	padding: 4px 6px;
	border-radius: 3px;
	margin-bottom: 6px;
	word-break: break-all;
	white-space: pre-wrap;
}
.pict-fe-solutionmap-tooltip-details {
	display: flex;
	gap: 12px;
	font-size: 11px;
	color: #8A7A6A;
}
`;
	}
}

module.exports = PictViewFormEditorSolutionMap;
module.exports.default_configuration = {};
