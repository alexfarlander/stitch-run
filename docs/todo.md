Edges visible only when node or entity are selected
Edge becoming visible when an entity moves across nodes

/canvas/ and /flow/ use different styles
I don't understand why /flow/ style is so different from /canvas/. Canvas is better. Plus, entities can't be in the flow, it is a back-office worker space. Currently, /flow/ looks very poorly done. 

Entities do not travel along edges


We need to create a clockwork canvas, with example nodes in every section, with entities coming from marketing sources, with revenue and costs changing accordingly. 

Nodes must be demo workers, with inside flows, which open in new canvases using m-architecture. 

For that, we need to deeply investigate the backend and write down all the functions that we've created, to map the possibilities of the system.

We need to write JSON properties for nodes to indicate them in journey history map of each entity. For example, if the entity has "Demo Call" in their history, then show what's the date of the call, and which team member was on this call. If the entity has "Free Demo" - show, when demo started and when it ends. It's like we need a dictionary or something.

Plus, we need to refine edge visibility - currently, edges are creating too much visual noise. What we need to do instead for BMC view is to make edges hidden by default, but appear in few cases:
1. If user selects a node, then all edges connected to this nore show up.
2. If an entity is in the process of travelling, then the travelling edge shows up.
3. If the "Show edges" toggle (which we have to add) is on. 

And we need to write a clear dictionary for the AI assistant, and add the Assistant to the canvas. 


## **Less important:**

Entity journey history - switch to API instead of public RLS
Figure out, Journey history stored in stitch_journey_events or JSONB?

Clarify Node Status visualization on Run vs node_states - stitch-run/src/components/canvas/RUN_STATUS_INDICATORS.md

Multiple mentioning of 12-section (search also for 12 section) canvas in docs

M-Shape description is not correct

Remove minimap


stitch-run/src/app/api/canvas/[id]/nodes/[nodeId]/config/route.ts - so we have nodes attached to individual canvases, or what's that?