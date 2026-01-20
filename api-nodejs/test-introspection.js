const axios = require('axios');

// GraphQL introspection query
const introspectionQuery = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function getSchema() {
  try {
    const response = await axios.post('https://api.allanime.day/api', 
      { query: introspectionQuery },
      {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://allanime.to',
        },
      }
    );

    // Save full schema to file
    const fs = require('fs');
    fs.writeFileSync('graphql-schema-full.json', JSON.stringify(response.data, null, 2));
    console.log('✅ Full schema saved to graphql-schema-full.json\n');

    // Print useful types
    const types = response.data.data.__schema.types;
    
    console.log('📚 MAIN QUERY TYPES:\n');
    const queryType = types.find(t => t.name === 'Query');
    if (queryType) {
      queryType.fields.forEach(field => {
        const args = field.args.map(a => `${a.name}: ${getTypeName(a.type)}`).join(', ');
        console.log(`${field.name}(${args}): ${getTypeName(field.type)}`);
        if (field.description) console.log(`  └─ ${field.description}`);
      });
    }

    console.log('\n\n📝 SEARCH INPUT FIELDS:\n');
    const searchInput = types.find(t => t.name === 'SearchInput');
    if (searchInput) {
      searchInput.inputFields.forEach(field => {
        console.log(`${field.name}: ${getTypeName(field.type)}`);
        if (field.description) console.log(`  └─ ${field.description}`);
      });
    }

    console.log('\n\n🎬 SHOW FIELDS:\n');
    const showType = types.find(t => t.name === 'Show');
    if (showType) {
      showType.fields.slice(0, 20).forEach(field => {
        console.log(`${field.name}: ${getTypeName(field.type)}`);
      });
      if (showType.fields.length > 20) {
        console.log(`... and ${showType.fields.length - 20} more fields`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

function getTypeName(type) {
  if (type.kind === 'NON_NULL') {
    return getTypeName(type.ofType) + '!';
  }
  if (type.kind === 'LIST') {
    return '[' + getTypeName(type.ofType) + ']';
  }
  return type.name;
}

getSchema();
