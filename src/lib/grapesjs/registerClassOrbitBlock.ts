export function registerClassOrbitBlock(editor: any, tutorClasses: any[] = []) {
  // Add block to GrapesJS
  editor.Blocks.add('class-orbit', {
    label: 'Classes Display',
    category: 'Tutor',
    media: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    content: {
      type: 'class-orbit-component',
      classes: ['class-orbit-container'],
    },
    activate: true,
  });

  // Define the component
  editor.DomComponents.addType('class-orbit-component', {
    model: {
      defaults: {
        tagName: 'div',
        classes: ['class-orbit-container'],
        attributes: { id: 'orbit-' + Math.random().toString(36).substr(2, 9) },
        traits: [
          {
            type: 'select',
            name: 'selectedClasses',
            label: 'Select Classes',
            options: [
              { value: '', label: 'None' },
              ...tutorClasses.map((c: any) => ({
              value: c.id,
              label: c.name,
            }))],
            changeProp: 1,
            multiple: true,
          },
          {
            type: 'color',
            name: 'buttonColor',
            label: 'Button Color',
            changeProp: 1,
          },
          {
            type: 'select',
            name: 'animationSpeed',
            label: 'Animation Speed',
            options: [
              { value: 'slow', label: 'Slow' },
              { value: 'normal', label: 'Normal' },
              { value: 'fast', label: 'Fast' },
            ],
            changeProp: 1,
          },
        ],
        'data-gjs-type': 'class-orbit-component',
        droppable: false,
        editable: false,
      },
      init(this: any) {
        this.on('change:selectedClasses', this.updateContent);
        this.on('change:buttonColor', this.updateContent);
        this.on('change:animationSpeed', this.updateContent);
      },
      updateContent(this: any) {
        const selectedClasses = this.get('selectedClasses') || '';
        const buttonColor = this.get('buttonColor') || '#f59e0b';
        const animationSpeed = this.get('animationSpeed') || 'normal';
        
        // Handle multi-select - selectedClasses can be string or array
        let classIds: string[] = [];
        if (Array.isArray(selectedClasses)) {
          classIds = selectedClasses;
        } else if (typeof selectedClasses === 'string' && selectedClasses) {
          classIds = selectedClasses.split(',').filter(id => id.trim());
        }
        
        const selectedClassesData = tutorClasses.filter((c: any) => 
          classIds.includes(c.id)
        );

        let html = '<div class="class-orbit-placeholder" style="width: 100%; min-height: 500px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 3rem 2rem; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">';
        
        if (selectedClassesData.length === 0) {
          html += '<div style="text-align: center; padding: 3rem;">';
          html += '<div style="font-size: 3rem; margin-bottom: 1rem;">🎓</div>';
          html += '<h3 style="font-size: 1.25rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Classes Display</h3>';
          html += '<p style="color: #6b7280; text-align: center;">No classes selected. Click to configure.</p>';
          html += '</div>';
        } else {
          // Show selected classes in a grid with better styling
          html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; max-width: 1200px; margin: 0 auto;">';
          selectedClassesData.forEach((c: any) => {
            html += '<div style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: white; transition: transform 0.2s;">';
            if (c.coverImageUrl) {
              html += '<div style="position: relative; height: 200px; overflow: hidden;">';
              html += '<img src="' + c.coverImageUrl + '" alt="' + c.name + '" style="width: 100%; height: 100%; object-fit: cover;" />';
              html += '<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);"></div>';
              html += '<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem;">';
              html += '<h4 style="color: white; font-weight: 700; font-size: 1.125rem; margin: 0 0 0.25rem 0; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">' + c.name + '</h4>';
              if (c.description) {
                html += '<p style="color: rgba(255,255,255,0.95); font-size: 0.875rem; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1.4;">' + c.description + '</p>';
              }
              html += '</div></div>';
            } else {
              html += `<div style="background: ${c.color || '#f59e0b'}; color: white; padding: 2rem 1.5rem; height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center;"><h4 style="font-weight: 700; font-size: 1.25rem; text-align: center; margin: 0 0 0.5rem 0;">${c.name}</h4>`;
              if (c.description) {
                html += `<p style="font-size: 0.875rem; opacity: 0.9; text-align: center; margin: 0; line-height: 1.4;">${c.description}</p>`;
              }
              html += '</div>';
            }
            html += '<div style="padding: 1rem; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">';
            html += '<p style="font-size: 0.875rem; color: #6b7280; margin: 0; font-weight: 500;">Select this class to enroll</p>';
            html += '</div>';
            html += '</div>';
          });
          html += '</div>';
          
          // Better preview indicator badge
          html += '<div style="position: absolute; top: 1.5rem; right: 1.5rem; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 0.625rem 1.25rem; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; box-shadow: 0 2px 8px rgba(245,158,11,0.3); letter-spacing: 0.025em;">';
          html += `${selectedClassesData.length} ${selectedClassesData.length === 1 ? 'Class' : 'Classes'} • Lock Overlay on Publish`;
          html += '</div>';
        }
        
        html += '</div>';
        
        this.set('content', html);
        
        // Store data attributes for runtime
        const classIdsString = classIds.join(',');
        this.addAttributes({
          'data-class-ids': classIdsString,
          'data-button-color': buttonColor,
          'data-animation-speed': animationSpeed,
        });
      },
    },
    view: {
      onRender() {
        // In editor, just show placeholder
        // Runtime component will be rendered on published site
      },
    },
  });

  // Add styles for the component
  editor.Css.addRules(`
    .class-orbit-container {
      width: 100%;
      min-height: 400px;
      position: relative;
    }
    .class-orbit-placeholder {
      user-select: none;
    }
  `);
}

