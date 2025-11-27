import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log(`Setting up demo data for user: ${user.id}`)

    // Insert demo children using service role
    const { data: children, error: childrenError } = await supabaseAdmin
      .from('children')
      .insert([
        { name: 'Emma Hansen', birth_date: '2019-03-15' },
        { name: 'Lucas Olsen', birth_date: '2020-07-22' },
        { name: 'Sofia Berg', birth_date: '2018-11-08' },
      ])
      .select()

    if (childrenError) {
      console.error('Error inserting children:', childrenError)
      throw childrenError
    }

    console.log(`Created ${children.length} demo children`)

    // Link first child to current user
    if (children && children.length > 0) {
      const { error: linkError } = await supabaseAdmin
        .from('parent_children')
        .insert({
          parent_id: user.id,
          child_id: children[0].id,
          relationship: 'Forelder',
          is_primary: true,
        })

      if (linkError) {
        console.error('Error linking child to parent:', linkError)
        throw linkError
      }

      console.log(`Linked child ${children[0].id} to user ${user.id}`)

      // Add authorized pickups for the child WITH CONSENT
      const { error: pickupsError } = await supabaseAdmin
        .from('authorized_pickups')
        .insert([
          {
            child_id: children[0].id,
            name: 'Mormor Anne',
            relationship: 'Besteforelder',
            phone: '987 65 432',
            consent_given: true,
            consent_date: new Date().toISOString(),
            added_by: user.id
          },
          {
            child_id: children[0].id,
            name: 'Tante Lisa',
            relationship: 'Tante',
            phone: '456 78 901',
            consent_given: true,
            consent_date: new Date().toISOString(),
            added_by: user.id
          },
        ])

      if (pickupsError) {
        console.error('Error adding authorized pickups:', pickupsError)
        throw pickupsError
      }

      console.log('Added 2 authorized pickups')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data created successfully',
        childCount: children.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in setup-demo function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})