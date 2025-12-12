# Requirements Document

## Introduction

The Media Library & Content Workflows feature adds a centralized asset management system to Stitch, enabling users to store, organize, and reuse media assets (images, videos, audio, documents) across workflows. The system consists of two components: a standalone Media Library for asset storage and retrieval, and Content Workflows that generate and consume media assets. This feature enables AI-powered content generation workflows such as wireframe generation and video production that leverage the shared media library.

## Glossary

- **Media Library**: A centralized storage system for media assets that is independent of any specific canvas or workflow
- **Stitch Asset**: A media file (image, video, audio, document) stored in the Media Library with associated metadata
- **Media Type**: A categorization of assets (image, wireframe, video, audio, style_reference, document)
- **Style Reference**: A special type of image asset used to maintain visual consistency across generated content
- **Wireframe**: An AI-generated image representing a scene or concept, typically used as input for video generation
- **Content Workflow**: A workflow that generates or processes media assets, reading from and writing to the Media Library
- **Scene**: A discrete segment of a script with visual description, voiceover text, and duration
- **Supabase Storage**: The file storage backend where actual media files are stored
- **Media Metadata**: Structured information about an asset including technical details and generation parameters

## Requirements

### Requirement 1

**User Story:** As a content creator, I want to upload and organize media assets in a centralized library, so that I can reuse assets across multiple workflows and projects.

#### Acceptance Criteria

1. WHEN a user uploads a file to the Media Library, THE system SHALL store the file in Supabase Storage and create a metadata record in the database
2. WHEN a user views the Media Library, THE system SHALL display all assets with thumbnails, names, types, and creation dates
3. WHEN a user filters assets by media type, THE system SHALL return only assets matching the selected type
4. WHEN a user searches for assets by name or description, THE system SHALL return assets matching the search query using full-text search
5. WHEN a user tags an asset, THE system SHALL store the tags and enable filtering by tag values

### Requirement 2

**User Story:** As a content creator, I want to preview and download media assets, so that I can review content and use it outside the system.

#### Acceptance Criteria

1. WHEN a user clicks on an asset, THE system SHALL display a preview modal with the appropriate viewer for the media type
2. WHEN a user requests to download an asset, THE system SHALL provide a direct public URL for downloading the asset
3. WHEN the system displays an image asset, THE system SHALL show the image dimensions and file size
4. WHEN the system displays a video or audio asset, THE system SHALL show the duration in seconds
5. WHEN a user views asset metadata, THE system SHALL display all technical and creative metadata including generation parameters

### Requirement 3

**User Story:** As a content creator, I want to manage my media assets, so that I can keep the library organized and remove unwanted content.

#### Acceptance Criteria

1. WHEN a user updates an asset's name or description, THE system SHALL persist the changes and update the timestamp
2. WHEN a user adds or removes tags from an asset, THE system SHALL update the tag array in the database
3. WHEN a user deletes an asset, THE system SHALL remove both the storage file and the metadata record
4. WHEN a user deletes an asset with a thumbnail, THE system SHALL remove both the main file and the thumbnail file
5. WHEN the system displays assets, THE system SHALL show only assets the authenticated user has permission to view

### Requirement 4

**User Story:** As a workflow designer, I want to select media assets from the library within workflows, so that I can use existing assets as inputs to workflow nodes.

#### Acceptance Criteria

1. WHEN a workflow reaches a media-select node, THE system SHALL display a media picker interface
2. WHEN a user selects an asset from the media picker, THE system SHALL output the asset ID, URL, name, and metadata
3. WHEN a media-select node has a media type filter configured, THE system SHALL display only assets of that type
4. WHEN a media-select node allows multiple selection, THE system SHALL enable the user to select multiple assets
5. WHEN a workflow re-runs with a media-select node, THE system SHALL remember the previously selected asset

### Requirement 5

**User Story:** As a content creator, I want to generate wireframe images from a script, so that I can create consistent visual representations for video production.

#### Acceptance Criteria

1. WHEN a user provides a script to the wireframe workflow, THE system SHALL parse the script into individual scenes with visual descriptions
2. WHEN the system generates a style reference image, THE system SHALL save it to the Media Library with type 'style_reference'
3. WHEN the system generates wireframe images, THE system SHALL use the style reference to maintain visual consistency across all scenes
4. WHEN the system generates a wireframe for a scene, THE system SHALL save it to the Media Library with metadata including scene index and prompt
5. WHEN all wireframes are generated, THE system SHALL display them in a grid for user review

### Requirement 6

**User Story:** As a content creator, I want to generate videos from wireframe images, so that I can produce animated content from static scenes.

#### Acceptance Criteria

1. WHEN a user selects wireframe images from the Media Library, THE system SHALL load the full metadata for each wireframe
2. WHEN the system generates a video from a wireframe, THE system SHALL use an image-to-video API to create animated content
3. WHEN the system generates a video, THE system SHALL save it to the Media Library with a reference to the source image
4. WHEN the system generates voiceover audio, THE system SHALL save it to the Media Library with type 'audio'
5. WHEN the system assembles a final video, THE system SHALL concatenate all scene videos and save the result to the Media Library
6. THE system SHALL handle long-running generation processes via polling or asynchronous job tracking to prevent HTTP timeouts during video creation

### Requirement 7

**User Story:** As a system administrator, I want media assets to be stored securely with proper access controls, so that user data is protected.

#### Acceptance Criteria

1. WHEN a user uploads an asset, THE system SHALL store it in a path prefixed with the user's ID
2. WHEN a user requests an asset, THE system SHALL verify the user is authenticated before providing access
3. WHEN the system creates a metadata record, THE system SHALL associate it with the uploading user's ID
4. WHEN a user attempts to delete an asset, THE system SHALL verify the user owns the asset before deletion
5. WHEN a user attempts to update an asset, THE system SHALL verify the user owns the asset before allowing modifications

### Requirement 8

**User Story:** As a workflow designer, I want workers to automatically save generated content to the Media Library, so that all workflow outputs are centrally stored and accessible.

#### Acceptance Criteria

1. WHEN a wireframe generator worker completes, THE system SHALL upload the generated image to the Media Library
2. WHEN an image-to-video worker completes, THE system SHALL upload the generated video to the Media Library
3. WHEN a voice generation worker completes, THE system SHALL upload the audio file to the Media Library
4. WHEN a worker saves an asset, THE system SHALL include generation metadata such as prompts, models, and parameters
5. WHEN a worker saves an asset, THE system SHALL tag it appropriately for discoverability

### Requirement 9

**User Story:** As a content creator, I want to upload media from external URLs, so that I can import AI-generated content directly into the library.

#### Acceptance Criteria

1. WHEN the system receives a URL for media upload, THE system SHALL fetch the file from the URL
2. WHEN the system fetches a file from a URL, THE system SHALL handle the data as a Buffer or Stream suitable for the runtime environment before uploading
3. WHEN the system uploads from a URL, THE system SHALL follow the same storage and metadata creation process as file uploads
4. WHEN a worker generates content via external API, THE system SHALL use URL upload to import the result
5. WHEN the system uploads from a URL, THE system SHALL handle fetch errors gracefully

### Requirement 10

**User Story:** As a content creator, I want to view media in both grid and list layouts, so that I can browse assets in my preferred format.

#### Acceptance Criteria

1. WHEN a user toggles to grid view, THE system SHALL display assets as thumbnail cards in a responsive grid
2. WHEN a user toggles to list view, THE system SHALL display assets in a table with columns for thumbnail, name, type, size, created date, and actions
3. WHEN the system displays a media card in grid view, THE system SHALL show a thumbnail, type badge, and name
4. WHEN a user hovers over a media card, THE system SHALL display quick action buttons
5. WHEN the system displays video or audio in grid view, THE system SHALL show the duration as a badge

### Requirement 11

**User Story:** As a developer, I want the media service to function in both browser and server environments, so that workflows can use media operations regardless of execution context.

#### Acceptance Criteria

1. WHEN the media service is called from the browser, THE system SHALL use standard Browser APIs including File and Blob
2. WHEN the media service is called from a server worker, THE system SHALL use Node.js compatible APIs including Buffer and Stream without crashing
3. WHEN the system handles file data, THE system SHALL abstract environmental differences so workflows do not need to know their execution context
4. WHEN the system uploads from a URL in a server context, THE system SHALL use Buffer or Stream instead of File objects
5. WHEN the system processes images in a browser context, THE system SHALL use File and Blob APIs for dimension extraction and preview
